// Career Counselling — Sarvam TTS plugin (bulbul:v3 streaming + v2 fallback).
// Fixes:
// 1. Dynamic script-language detection: automatically uses 'en-IN' for Latin text
//    (English / Romanized Hinglish) and 'hi-IN' for Devanagari text. Prevents Sarvam's
//    Hindi phonetic engine from mangling English words (which caused muted/distorted sound).
// 2. 8s fast timeout (prevents long hangs).
// 3. Loudness=1.0 (prevents overdrive clipping).
// 4. clampPcm16() for PCM protection.
import axios from 'axios';
import http from 'http';
import https from 'https';
import { logger } from '../utils/logger';

// ✅ HTTP keep-alive agents — reuse TCP connections for lower latency
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 6 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 6 });
const sarvamAxios = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 8000,
});

// ─── WAV header parser (for v2 base64 WAV fallback responses) ────────────────
function findWavDataOffset(wavBuffer: Buffer): number {
  if (wavBuffer.length < 12) return 44;

  const riff = wavBuffer.toString('ascii', 0, 4);
  if (riff !== 'RIFF') {
    logger.warn('⚠️  Response is NOT a WAV file (no RIFF header). Treating as raw PCM.');
    return 0;
  }

  let offset = 12;
  while (offset + 8 <= wavBuffer.length) {
    const chunkId   = wavBuffer.toString('ascii', offset, offset + 4);
    const chunkSize = wavBuffer.readUInt32LE(offset + 4);

    if (chunkId === 'data') {
      return offset + 8;
    }
    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset += 1;
  }

  logger.warn('⚠️  Could not find "data" chunk in WAV — falling back to offset 44');
  return 44;
}

// ─── PCM clipping protection — prevents distortion from out-of-range values ──
function clampPcm16(pcmBuffer: Buffer): Buffer {
  if (pcmBuffer.length < 2) return pcmBuffer;
  const samples = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.byteLength / 2);
  let clipped = 0;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] > 32000) { samples[i] = 32000; clipped++; }
    else if (samples[i] < -32000) { samples[i] = -32000; clipped++; }
  }
  if (clipped > 0) {
    logger.info(`🔊 PCM: clamped ${clipped} samples (anti-distortion)`);
  }
  return pcmBuffer;
}

// Sarvam ONLY accepts regional Indian codes
const SARVAM_LANGS = new Set([
  'as-IN', 'bn-IN', 'brx-IN', 'doi-IN', 'en-IN', 'gu-IN', 'hi-IN', 'kn-IN',
  'kok-IN', 'ks-IN', 'mai-IN', 'ml-IN', 'mni-IN', 'mr-IN', 'ne-IN', 'od-IN',
  'pa-IN', 'sa-IN', 'sat-IN', 'sd-IN', 'ta-IN', 'te-IN', 'ur-IN',
]);

function normalizeSarvamLanguage(lang: string): string {
  const l = (lang || 'hi-IN').toLowerCase().trim();
  if (SARVAM_LANGS.has(l)) return l;
  const regional = `${l.split('-')[0]}-IN`;
  return SARVAM_LANGS.has(regional) ? regional : 'hi-IN';
}

// ─── Dynamic script-language detection ────────────────────────────────────────
// Prevents passing English text to hi-IN model (which distorted English words).
function autoDetectScriptLanguage(text: string, fallbackLang: string): string {
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  if (latinCount > devanagariCount && latinCount >= 3) {
    return 'en-IN'; // English / Romanized Hinglish text → en-IN model
  }
  if (devanagariCount > latinCount && devanagariCount >= 3) {
    return 'hi-IN'; // Devanagari text → hi-IN model
  }
  return fallbackLang;
}

// Pace: 1.0 = normal human speaking rate. Clamped to [0.5, 2.0].
function normalizePace(pace?: any): number {
  const raw = pace ?? parseFloat(process.env.SARVAM_PACE || '1.0');
  const n = Number.isFinite(Number(raw)) ? Number(raw) : 1.0;
  return Math.min(2.0, Math.max(0.5, n));
}

// ─────────────────────────────────────────────────────────────────────────────
export const createSarvamTTS = (config: any) => {

  const SAMPLE_RATE = 24000;

  return {
    generate: async (text: string, abortSignal?: AbortSignal, diagnostic?: { turnId?: string }): Promise<Buffer> => {
      const turnId = diagnostic?.turnId || 'SYSTEM';
      const speaker  = config.voice    || process.env.SARVAM_VOICE  || 'anushka';
      const model    = config.model    || process.env.SARVAM_MODEL  || 'bulbul:v2';
      const baseLang = normalizeSarvamLanguage(config.language || process.env.SARVAM_LANGUAGE || 'hi-IN');
      // ✨ Auto-detect script language so English words get 'en-IN' and Hindi gets 'hi-IN'
      const language = autoDetectScriptLanguage(text, baseLang);
      const pace     = normalizePace(config.pace);
      const apiKey   = process.env.SARVAM_API_KEY;

      if (!apiKey) {
        throw new Error('SARVAM_API_KEY is not set in environment');
      }

      const isV3 = model.startsWith('bulbul:v3');

      logger.info(`🗣️  Sarvam TTS ▶ speaker=${speaker}, model=${model}, lang=${language}, pace=${pace}, len=${text.length}, v3=${isV3}`);

      // ══════════════════════════════════════════════════════════════════════
      //  bulbul:v3 — Streaming endpoint (/text-to-speech/stream)
      //  Returns raw PCM with output_audio_codec=linear16
      // ══════════════════════════════════════════════════════════════════════
      if (isV3) {
        const payload: Record<string, any> = {
          text:                 text,
          target_language_code: language,
          speaker:              speaker,
          model:                model,
          output_audio_codec:   'linear16',
          speech_sample_rate:   SAMPLE_RATE,
          enable_preprocessing: true,
          pace:                 pace,
          min_buffer_size:      config.min_buffer_size || 10,
        };

        let response: any;
        try {
          response = await sarvamAxios.post(
            'https://api.sarvam.ai/text-to-speech/stream',
            payload,
            {
              headers: {
                'api-subscription-key': apiKey,
                'Content-Type':         'application/json',
              },
              responseType: 'arraybuffer',
              signal: abortSignal,
            },
          );
        } catch (err: any) {
          if (axios.isCancel(err) || err.name === 'AbortError') {
            logger.warn(`[TTS] GENERATE_ABORTED | turnId=${turnId}`);
            logger.info(`🛑 Sarvam v3 API request aborted by user barge-in.`);
            return Buffer.alloc(0);
          }
          const status = err.response?.status;
          let body: string;
          try {
            const raw = err.response?.data;
            body = raw instanceof ArrayBuffer || Buffer.isBuffer(raw)
              ? Buffer.from(raw as any).toString('utf-8')
              : JSON.stringify(raw ?? err.message);
          } catch (_) {
            body = err.message;
          }
          logger.error(`❌ Sarvam v3 API error: status=${status}, body=${body}`);
          logger.warn(`⚠️ Falling back to v2 non-streaming endpoint...`);
          response = null;
        }

        if (response) {
          const pcmBuffer = clampPcm16(Buffer.from(response.data));
          logger.info(`[TTS] GENERATE_COMPLETE | turnId=${turnId} | inputLength=${text.length} | outputBytes=${pcmBuffer.length}`);
          logger.info(`📦 Sarvam v3 Native PCM buffer: ${pcmBuffer.length} bytes (~${(pcmBuffer.length / 2 / SAMPLE_RATE).toFixed(2)} s)`);

          if (pcmBuffer.length > 0) {
            return pcmBuffer;
          }
          logger.warn('⚠️ v3 PCM buffer is empty — falling back to v2');
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      //  bulbul:v2 — Non-streaming endpoint (fallback)
      // ══════════════════════════════════════════════════════════════════════
      const v2Payload: Record<string, any> = {
        text:                 text,
        target_language_code: language,
        speaker:              isV3 ? 'anushka' : speaker,
        model:                isV3 ? 'bulbul:v2' : model,
        pace:                 pace,
        speech_sample_rate:   SAMPLE_RATE,
        pitch:                0,
        loudness:             1.0,
        enable_preprocessing: true,
      };

      let response: any;
      try {
        response = await sarvamAxios.post(
          'https://api.sarvam.ai/text-to-speech',
          v2Payload,
          {
            headers: {
              'api-subscription-key': apiKey,
              'Content-Type':         'application/json',
            },
            responseType: 'json',
            signal: abortSignal,
          },
        );
      } catch (err: any) {
        if (axios.isCancel(err) || err.name === 'AbortError') {
          logger.warn(`[TTS] GENERATE_ABORTED | turnId=${turnId}`);
          logger.info(`🛑 Sarvam v2 API request aborted by user barge-in.`);
          return Buffer.alloc(0);
        }
        const status = err.response?.status;
        const body   = JSON.stringify(err.response?.data ?? err.message);
        logger.error(`❌ Sarvam v2 API error: status=${status}, body=${body}`);
        throw err;
      }

      const audios = response.data?.audios;
      if (!Array.isArray(audios) || audios.length === 0 || !audios[0]) {
        logger.error(`❌ Sarvam response missing audios array: ${JSON.stringify(response.data)}`);
        throw new Error('Sarvam returned no audio data');
      }

      const base64Audio: string = audios[0];
      const wavBuffer = Buffer.from(base64Audio, 'base64');

      if (wavBuffer.length < 8) {
        throw new Error(`Sarvam audio buffer too small: ${wavBuffer.length} bytes`);
      }

      const dataOffset = findWavDataOffset(wavBuffer);
      const pcmBuffer = clampPcm16(wavBuffer.subarray(dataOffset));
      logger.info(`[TTS] GENERATE_COMPLETE | turnId=${turnId} | inputLength=${text.length} | outputBytes=${pcmBuffer.length}`);

      if (pcmBuffer.length === 0) {
        throw new Error('PCM buffer is empty after WAV header strip');
      }

      return pcmBuffer;
    },

    /** Exposed so the worker can build AudioSource at the correct rate */
    sampleRate: SAMPLE_RATE,
  };
};

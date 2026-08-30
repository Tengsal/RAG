// Career Counselling — Deepgram STT plugin (nova-3, 48kHz, 300ms endpointing,
// auto-reconnect, keepalive). Upgraded from nova-2 → nova-3 for better accuracy
// on Hinglish/Hindi speech. Model configurable via dashboard/env.
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export const createDeepgramSTT = (config: any) => {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY is not set in environment');

  const deepgram = createClient(apiKey);
  const emitter  = new EventEmitter();

  let connection:   any     = null;
  let isConnected:  boolean = false;
  let isClosed:     boolean = false; // set to true on cleanup() — stop reconnecting
  let reconnectTimer: NodeJS.Timeout | null = null;
  let keepAliveTimer: NodeJS.Timeout | null = null;

  // Reconnect backoff + permanent-failure detection
  let reconnectDelayMs = 1000;
  let consecutiveFailures = 0;
  const MAX_RECONNECT_FAILURES = 8;
  let sttFailed = false;

  // Buffer audio chunks that arrive during a reconnect gap
  const audioBuffer: Buffer[] = [];

  // ── Map BCP-47 language codes to Deepgram language codes ────────────────
  const DEEPGRAM_LANG_MAP: Record<string, string> = {
    'hi-IN': 'hi',       // Hindi
    'en-IN': 'en-IN',    // English (India)
    'bn-IN': 'bn',       // Bengali
    'gu-IN': 'gu',       // Gujarati
    'kn-IN': 'kn',       // Kannada
    'ml-IN': 'ml',       // Malayalam
    'mr-IN': 'mr',       // Marathi
    'or-IN': 'or',       // Odia
    'od-IN': 'or',       // Odia (dashboard sends 'od')
    'pa-IN': 'pa',       // Punjabi
    'ta-IN': 'ta',       // Tamil
    'te-IN': 'te',       // Telugu
    'as-IN': 'as',       // Assamese
  };

  const rawLang = (config.language || 'en-IN').toLowerCase();
  // Hinglish (Hindi + English mixed): use 'hi' — the Hindi model handles
  // code-switched English words. 'hi-Latn' is rejected by Deepgram.
  // nova-3 with 'multi' may work better for Hinglish than nova-2, but
  // phone/SIP audio quality can be variable — 'hi' is the safer default.
  const bare = rawLang.split('-')[0];
  const dgLang = bare === 'hi' || rawLang.includes('hinglish') ? 'hi'
               : bare === 'en' ? 'en-IN'
               : DEEPGRAM_LANG_MAP[rawLang] || DEEPGRAM_LANG_MAP[`${bare}-IN`] || 'hi';

  // ✅ nova-3 by default — better accuracy, especially for Hinglish
  const dgModel = config.stt_model || process.env.STT_MODEL || 'nova-3';

  logger.info(`🎙️  Deepgram config: model=${dgModel}, language=${dgLang} (from ${rawLang})`);

  function connect() {
    if (isClosed) return;

    logger.info('🔄 Deepgram: creating live connection...');

    connection = deepgram.listen.live({
      model:        dgModel,
      language:     dgLang,
      smart_format: true,
      encoding:     'linear16',   // Int16 PCM from LiveKit
      sample_rate:  48000,        // LiveKit standard audio rate
      channels:     1,
      endpointing:  300,          // 300ms silence → emit final transcript
      interim_results: true,      // stream partial transcripts LIVE (barge-in)
      utterance_end_ms: 1500,     // nova-3: detect end of utterance for better segmentation
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      logger.info('🟢 Deepgram: connected');
      isConnected = true;
      consecutiveFailures = 0;
      reconnectDelayMs = 1000;
      emitter.emit('connected');

      // Keepalive every 8s to prevent Deepgram closing idle connections
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      keepAliveTimer = setInterval(() => {
        if (isConnected && connection && connection.getReadyState() === 1) {
          try {
            connection.keepAlive();
          } catch (_) {
            try { connection.send(Buffer.alloc(0)); } catch (_) {}
          }
        }
      }, 8000);

      // Flush buffered audio that arrived during reconnect
      if (audioBuffer.length > 0) {
        logger.info(`🔁 Deepgram: flushing ${audioBuffer.length} buffered chunks`);
        for (const chunk of audioBuffer) {
          connection.send(chunk);
        }
        audioBuffer.length = 0;
      }
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const alt = data?.channel?.alternatives?.[0];
      if (!alt) return;

      const transcript: string = alt.transcript ?? '';
      const isFinal:    boolean = data.is_final ?? false;

      if (transcript && isFinal) {
        logger.info(`[STT] FINAL_TRANSCRIPT | length=${transcript.length} | text="${transcript.substring(0, 100)}"`);
        logger.info(`📝 Deepgram transcript: "${transcript}"`);
        emitter.emit('transcript', transcript);
      } else if (transcript && !isFinal) {
        // Interim results power live barge-in in the worker
        logger.info(`[STT] INTERIM_TRANSCRIPT | length=${transcript.length} | text="${transcript.substring(0, 100)}"`);
        emitter.emit('interimTranscript', transcript);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (err: any) => {
      if (isClosed) return; // teardown noise after close()
      logger.error(`❌ Deepgram error: ${err?.message || err}`);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      logger.warn('🔴 Deepgram: connection closed');
      isConnected = false;
      emitter.emit('disconnected');

      if (isClosed || sttFailed) return;

      consecutiveFailures++;
      if (consecutiveFailures >= MAX_RECONNECT_FAILURES) {
        sttFailed = true;
        logger.error(`❌ Deepgram: ${consecutiveFailures} consecutive failed connections — giving up (deaf agent)`);
        emitter.emit('sttFailed');
        return;
      }
      logger.info(`🔄 Deepgram: reconnecting in ${(reconnectDelayMs / 1000).toFixed(0)}s (attempt ${consecutiveFailures}/${MAX_RECONNECT_FAILURES})...`);
      reconnectTimer = setTimeout(connect, reconnectDelayMs);
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, 10000);
    });
  }

  // Initial connection
  connect();

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    on: (event: string, listener: (...args: any[]) => void) =>
      emitter.on(event, listener),

    pushAudio: (buffer: Buffer) => {
      if (isClosed) return;

      if (isConnected && connection && connection.getReadyState() === 1) {
        connection.send(buffer);
      } else {
        // Buffer while reconnecting — cap at ~2 s of audio
        if (audioBuffer.length < 40) {
          audioBuffer.push(buffer);
        }
      }
    },

    close: () => {
      logger.info('🔵 Deepgram: closing');
      isClosed   = true;
      isConnected = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      try { connection?.finish(); } catch (_) {}
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Lead capture → Google Sheets (Apps Script webhook) + local JSONL fallback.
//
// After every call the worker:
//   1. extracts structured lead fields from the transcript (one fast Groq call)
//   2. POSTs the flat lead object to GOOGLE_SHEET_WEBHOOK_URL (if configured)
//   3. ALWAYS appends it to leads/leads.jsonl (never lose a lead)
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { OpenAI } from 'openai';
import { logger } from './utils/logger';

export interface LeadRecord {
  call_id: string;
  lead_id?: string;
  lead_name?: string;
  phone: string;
  status: string;
  duration_s: number;
  qualification?: string;
  interested_course?: string;
  callback_time?: string;
  email?: string;
  notes?: string;
  transcript: string;
  created_at: string;
}

const leadsDir = () => process.env.LEAD_LOGS_DIR || path.join(process.cwd(), 'leads');
const leadsFile = () => path.join(leadsDir(), 'leads.jsonl');

function appendJsonl(record: LeadRecord): string {
  fs.mkdirSync(leadsDir(), { recursive: true });
  fs.appendFileSync(leadsFile(), JSON.stringify(record) + '\n', 'utf-8');
  return leadsFile();
}

async function postToSheets(record: LeadRecord): Promise<boolean> {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!webhookUrl) return false;
  try {
    const flat: Record<string, any> = {
      timestamp: record.created_at,
      call_id: record.call_id,
      lead_id: record.lead_id || '',
      lead_name: record.lead_name || '',
      phone: record.phone,
      status: record.status,
      duration_s: record.duration_s,
      qualification: record.qualification || '',
      interested_course: record.interested_course || '',
      callback_time: record.callback_time || '',
      email: record.email || '',
      notes: record.notes || '',
      transcript: record.transcript.slice(0, 3000),
    };
    await axios.post(webhookUrl, flat, { timeout: 8000 });
    logger.info(`📊 Lead pushed to Google Sheets: ${record.lead_name || record.phone}`);
    return true;
  } catch (err: any) {
    logger.warn(`⚠️ Google Sheets push failed (${err?.message?.slice(0, 120)}). Lead is safe in leads.jsonl.`);
    return false;
  }
}

/** Save lead: local JSONL always, Sheets when webhook configured. */
export async function saveLead(record: LeadRecord): Promise<{ sheets: boolean; file: string }> {
  const file = appendJsonl(record);
  const sheets = await postToSheets(record);
  return { sheets, file };
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-call lead extraction — one fast, non-streaming Groq call.
// Model-aware: gpt-oss / o-series reasoning models reject max_tokens and
// temperature≠1, so they get max_completion_tokens + reasoning_effort.
// Runs AFTER the call ends so it never adds latency to the conversation.
// ─────────────────────────────────────────────────────────────────────────────
export async function extractLeadFromTranscript(
  transcript: string,
  known: { lead_name?: string; phone: string },
): Promise<Partial<LeadRecord>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || transcript.trim().length < 20) return {};

  const client = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
  const model = process.env.GROQ_EXTRACT_MODEL || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const system = `Extract career-counselling lead details from this call transcript.
Return STRICT JSON only, no markdown, with these keys (use "" for missing):
{"name": "", "qualification": "", "interested_course": "", "callback_time": "", "email": "", "notes": ""}
notes: 1 short sentence max summarising their career goal.`;

  try {
    const isReasoning = /gpt-oss|gpt-5|^o[0-9]|reasoning/i.test(model);
    const params: any = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: transcript.slice(-4000) },
      ],
    };
    if (isReasoning) {
      // Reasoning models reject max_tokens / temperature≠1 — use their params
      params.temperature = 1;
      params.top_p = 1;
      params.max_completion_tokens = 400;
      params.reasoning_effort = 'low'; // fast extraction, not deep reasoning
    } else {
      params.temperature = 0.2;
      params.max_tokens = 250;
    }
    const res = await client.chat.completions.create(params as any);

    const raw = res.choices?.[0]?.message?.content ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('⚠️ Lead extraction returned no JSON — using raw transcript only.');
      return {};
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      lead_name: parsed.name?.trim() || known.lead_name || '',
      qualification: parsed.qualification?.trim() || '',
      interested_course: parsed.interested_course?.trim() || '',
      callback_time: parsed.callback_time?.trim() || '',
      email: parsed.email?.trim() || '',
      notes: parsed.notes?.trim() || '',
    };
  } catch (err: any) {
    logger.warn(`⚠️ Lead extraction failed (${err?.message?.slice(0, 120)}). Using raw transcript only.`);
    return {};
  }
}

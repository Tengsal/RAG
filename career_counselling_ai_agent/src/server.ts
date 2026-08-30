// ═══════════════════════════════════════════════════════════════════════════
// ASSAM DOWN TOWN UNIVERSITY (AdtU) CAREER COUNSELLING DISPATCH SERVER
// Express + Node.js + MongoDB Atlas + Google Auth + Gemini 3.6 Flash
// ═══════════════════════════════════════════════════════════════════════════
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AgentDispatchClient, SipClient } from 'livekit-server-sdk';
import { buildSystemPrompt, ADTU_COURSES } from './prompts';
import { AdtuCourse } from './models/AdtuCourse';
import { AdtuLead } from './models/AdtuLead';
import { seedAdtuCourses } from './scripts/seed_courses';
import authRoutes from './routes/authRoutes';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '5100', 10);
const AGENT_NAME = process.env.AGENT_NAME || 'career-counsellor';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://school-management:school-management@cluster0.tk0qz.mongodb.net/multi_agent_system?retryWrites=true&w=majority&appName=Cluster0';

// Connect MongoDB Atlas
mongoose.connect(MONGODB_URI)
  .then(async () => {
    logger.info('✅ Connected to MongoDB Atlas');
    await seedAdtuCourses();
  })
  .catch((err) => logger.error(`❌ MongoDB Connection error: ${err.message}`));

const agentDispatch = new AgentDispatchClient(
  process.env.LIVEKIT_URL!.replace(/^wss/, 'https'),
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!,
);

interface CallRecord {
  call_id: string;
  room: string;
  phone: string;
  lead_id?: string;
  lead_name?: string;
  course?: string;
  status: string;
  error?: string;
  duration?: number;
  created_at: string;
}

const calls: CallRecord[] = [];
const callsFile = () => path.join(process.cwd(), 'calls.jsonl');
const leadsFile = () => path.join(process.env.LEAD_LOGS_DIR || path.join(process.cwd(), 'leads'), 'leads.jsonl');

function appendCallRecord(r: CallRecord) {
  calls.push(r);
  try {
    fs.appendFileSync(callsFile(), JSON.stringify(r) + '\n', 'utf-8');
  } catch (_) {}
}

export function normalizePhone(phone: string): string {
  let p = phone.trim().replace(/[^\d+]/g, '');
  if (!p.startsWith('+')) {
    if (p.length === 10) p = '+91' + p;
    else if (p.length === 12 && p.startsWith('91')) p = '+' + p;
    else p = '+91' + p;
  }
  return p;
}

const pending = new Map<string, () => void>();

function dispatchOne(contact: any): CallRecord {
  const phone = normalizePhone(String(contact.phone ?? ''));
  const callId = uuidv4();
  const roomName = `career-${phone.replace(/\D/g, '')}-${callId.substring(0, 8)}`;

  const metadata = JSON.stringify({
    phone_number: phone,
    call_id: callId,
    lead_id: contact.lead_id ?? null,
    lead_name: contact.lead_name ?? null,
    course: contact.course ?? null,
    language: contact.language || process.env.SARVAM_LANGUAGE || 'hi-IN',
    pace: contact.pace || null,
    voice: contact.voice || null,
    tts_model: contact.tts_model || null,
    llm_model: contact.llm_model || null,
    stt_model: contact.stt_model || null,
    system_prompt: contact.system_prompt || buildSystemPrompt(),
  });

  const record: CallRecord = {
    call_id: callId,
    room: roomName,
    phone,
    lead_id: contact.lead_id,
    lead_name: contact.lead_name,
    course: contact.course,
    status: 'dispatching',
    created_at: new Date().toISOString(),
  };
  appendCallRecord(record);

  agentDispatch
    .createDispatch(roomName, AGENT_NAME, { metadata })
    .then(() => {
      logger.info(`✅ Agent "${AGENT_NAME}" dispatched → ${roomName} (${phone})`);
      const rec = calls.find((c) => c.call_id === callId);
      if (rec) rec.status = 'ringing';
    })
    .catch((err: any) => {
      logger.error(`❌ Dispatch failed for ${phone}: ${err?.message || err}`);
      const rec = calls.find((c) => c.call_id === callId);
      if (rec) {
        rec.status = 'failed';
        rec.error = String(err?.message || err);
      }
      const done = pending.get(callId);
      if (done) { pending.delete(callId); done(); }
    });

  return record;
}

// ─────────────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Serve Frontend Dashboard (public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Register Google OAuth Routes
app.use('/api/auth', authRoutes);

// Health Check
app.get('/health', (_req: any, res: any) => {
  res.json({
    ok: true,
    university: 'Assam Down Town University (AdtU)',
    agent: AGENT_NAME,
    trunk: process.env.SIP_TRUNK_ID || null,
    transfer_default: process.env.DEFAULT_TRANSFER_NUMBER || '+919678926411',
    groq_model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    tts: `${process.env.SARVAM_MODEL || 'bulbul:v3'}/${process.env.SARVAM_VOICE || 'kavya'}`,
    stt: `deepgram ${process.env.STT_MODEL || 'nova-3'}`,
    mongo_connected: mongoose.connection.readyState === 1,
    sheets_webhook: !!process.env.GOOGLE_SHEET_WEBHOOK_URL,
  });
});

// AdtU Course List API (MongoDB + Prompts fallback)
app.get('/api/courses', async (_req: any, res: any) => {
  try {
    const dbCourses = await AdtuCourse.find({ isActive: true }).sort({ isPopular: -1, courseName: 1 });
    if (dbCourses.length > 0) {
      return res.json({ success: true, count: dbCourses.length, courses: dbCourses });
    }
  } catch (_) {}
  res.json({ success: true, courses: ADTU_COURSES });
});

// AdtU Course CRUD API
app.post('/api/adtu-courses', async (req: any, res: any) => {
  try {
    const course = new AdtuCourse(req.body);
    await course.save();
    res.json({ success: true, course });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// AdtU MongoDB Leads API with Gemini 3.6 Flash summaries
app.get('/api/adtu-leads', async (_req: any, res: any) => {
  try {
    const leads = await AdtuLead.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: leads.length, leads });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single Call Dispatch
app.post('/api/calls', (req: any, res: any) => {
  const { phone } = req.body ?? {};
  if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
  const record = dispatchOne(req.body);
  res.json({ success: true, call_id: record.call_id, room: record.room });
});

// Bulk Call Campaign Dispatch
app.post('/api/calls/bulk', async (req: any, res: any) => {
  const { contacts, delay_between_ms } = req.body ?? {};
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ success: false, error: 'contacts array is required' });
  }

  const delayMs = parseInt(delay_between_ms ?? process.env.BULK_CALL_DELAY_MS ?? '15000', 10);
  res.json({ success: true, queued: contacts.length });

  for (const contact of contacts) {
    const record = dispatchOne(contact);

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(record.call_id);
        logger.warn(`⏱️ No status for ${record.phone} within 6 min — moving to next lead`);
        resolve();
      }, 360000);
      pending.set(record.call_id, () => { clearTimeout(timer); resolve(); });
    });

    logger.info(`⏳ ${Math.round(delayMs / 1000)}s pause before next lead...`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  logger.info('✅ Bulk campaign finished.');
});

// Call Transfer API
app.post('/api/calls/transfer', async (req: any, res: any) => {
  try {
    const { room_name, transfer_to } = req.body ?? {};
    const targetNumber = transfer_to || process.env.DEFAULT_TRANSFER_NUMBER || '+919678926411';
    
    logger.info(`📞 Manual Call Transfer triggered for room ${room_name} → ${targetNumber}`);
    res.json({ success: true, transferredTo: targetNumber });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Worker Call-Status Callback Webhook
app.post('/api/voice/webhook/call-status', (req: any, res: any) => {
  const { call_id, phone, room_name, status, duration, error } = req.body ?? {};
  const rec = calls.find((c) => c.call_id === call_id);
  if (rec) {
    rec.status = status;
    rec.duration = duration;
    rec.error = error;
  }
  logger.info(`📡 Call status: ${phone} → ${status}${error ? ` (${error})` : ''}`);
  const done = pending.get(call_id);
  if (done) { pending.delete(call_id); done(); }
  res.json({ success: true });
});

// Local JSONL Logs
app.get('/api/calls', (_req: any, res: any) => res.json({ success: true, calls: calls.slice(-100).reverse() }));
app.get('/api/leads', (_req: any, res: any) => {
  try {
    const lines = fs.existsSync(leadsFile())
      ? fs.readFileSync(leadsFile(), 'utf-8').trim().split('\n').filter(Boolean)
      : [];
    const leads = lines.map((l) => JSON.parse(l)).slice(-200).reverse();
    res.json({ success: true, count: leads.length, leads });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

app.listen(PORT, () => {
  logger.info(`🎓 Assam Down Town University (AdtU) Career Server listening on http://localhost:${PORT}`);
  logger.info(`   Agent name: ${AGENT_NAME} | Trunk: ${process.env.SIP_TRUNK_ID || 'MISSING'}`);
  logger.info(`   MongoDB Atlas: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Connecting...'}`);
  logger.info(`   Default Call Transfer Number: ${process.env.DEFAULT_TRANSFER_NUMBER || '+919678926411'}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// CAREER COUNSELLING VOICE WORKER — v2 (latency-optimised)
//
// Pipeline:
//   Deepgram nova-3 STT (48kHz, 300ms endpointing, live barge-in)
//   → Groq llama-3.1-8b-instant (~0.15s first token, 80 max_tokens)
//   → Sarvam bulbul:v3 TTS (24kHz linear16, pace 1.0, clause-level streaming)
//
// Key latency & realism techniques:
//   • Greeting TTS pre-generated WHILE the phone is ringing
//   • Clause-level TTS: speak each sentence as soon as the LLM emits it
//   • 150ms chunked playback → true barge-in, stop speaking within 150ms
//   • Barge-in on interim transcripts: stop talking the moment the caller speaks
//   • History trimming (head 3 + tail 14) → small context → fast inference
//   • No tool-calling: single fast streaming completion per turn
//   • STT closed immediately on endCall → no ghost transcripts
//   • agentBusy flag covers TTS generation time (prevents false silence)
//   • Silence: 5s → "kya aap line pe hai?" warning, 10s → bye + hang up
// ═══════════════════════════════════════════════════════════════════════════
import 'dotenv/config';
import http from 'http';
import https from 'https';
import {
  type JobContext,
  WorkerOptions,
  cli,
  defineAgent,
} from '@livekit/agents';
import {
  AudioFrame,
  AudioSource,
  LocalAudioTrack,
  RoomEvent,
  TrackKind,
  AudioStream,
} from '@livekit/rtc-node';
import { SipClient, RoomServiceClient } from 'livekit-server-sdk';
import mongoose from 'mongoose';
import { createDeepgramSTT } from './plugins/deepgram';
import { createSarvamTTS } from './plugins/tts';
import { createGroqLLM } from './plugins/llm';
import { buildSystemPrompt, buildGreeting, POST_GREETING_RULES } from './prompts';
import { saveLead, extractLeadFromTranscript, LeadRecord } from './sheets';
import { AdtuCourse } from './models/AdtuCourse';
import { AdtuLead } from './models/AdtuLead';
import { generateGeminiSummary } from './services/geminiSummarizer';
import { logger } from './utils/logger';
import { newTurnId, turnError, turnLog } from './utils/turnLogger';
import { AdtuUniversityInfo } from './models/AdtuUniversityInfo';

// ── Connect to MongoDB Atlas (if not connected) ──────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://school-management:school-management@cluster0.tk0qz.mongodb.net/multi_agent_system?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(MONGODB_URI).then(() => {
  logger.info('✅ Worker connected to MongoDB Atlas');
}).catch((e) => logger.warn(`⚠️ Worker MongoDB connection warning: ${e.message}`));

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
// ── Helper: Assam Down Town University — University Info Lookup ─────────────
// Queries the seeded AdtuUniversityInfo collection for non-course facts:
// Vice Chancellor, scholarships, committees, rules, facilities, etc.
// The section is auto-detected from the topic keywords.
async function queryUniversityInfo(topic: string): Promise<string> {
  try {
    const topicLower = (topic || '').toLowerCase();

    // Map topic keywords → MongoDB section name
    let section = 'administration';  // default
    if (/vice chancellor|vc|president|chancellor|registrar|dean|controller|director|pro vice/i.test(topicLower)) {
      section = 'administration';
    } else if (/scholarship|waiver|financial aid|xopun|merit scholarship|sports scholarship/i.test(topicLower)) {
      section = 'fees_and_scholarships';
    } else if (/attendance|backlog|promotion|ragging|student conduct|examination process/i.test(topicLower)) {
      section = 'rules_and_policies';
    } else if (/admission|documents? required|eligibility matrix|application process/i.test(topicLower)) {
      section = 'admissions';
    } else if (/academic calendar|semester (start|begin|end)|exam date|holiday|orientation/i.test(topicLower)) {
      section = 'academic_calendar';
    } else if (/library|hostel|transport|bus|dosa|grievance|equal opportunity|icc|placement cell|counselling/i.test(topicLower)) {
      section = 'student_services';
    } else if (/anti[- ]?ragging|committee|icc|internal complaints/i.test(topicLower)) {
      section = 'committees';
    } else if (/university (address|contact|phone|email|meta|about)/i.test(topicLower)) {
      section = 'university_metadata';
    } else if (/facility|facilities/i.test(topicLower)) {
      section = 'facilities';
    }

    const record = await AdtuUniversityInfo.findOne({ section });
    if (!record) {
      return `[AdtU Info]: No data found for "${topic}". Advise the caller to speak with a senior counsellor.`;
    }

    const data = record.data;
    const text = formatUniversityData(section, data, topicLower);
    return `[AdtU ${section.replace(/_/g, ' ')}]: ${text}`;
  } catch (e: any) {
    logger.warn(`⚠️ MongoDB university info query error: ${e?.message}`);
    return `[AdtU Info]: Could not retrieve university information right now. Please transfer to a senior counsellor for this query.`;
  }
}

// ── Helper: render a university-info section as spoken text ────────────────
function formatUniversityData(section: string, data: any, topicLower: string): string {
  try {
    switch (section) {
      case 'administration': {
        // Specific name lookup
        const nameMatch = topicLower.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
        const leaders = (data?.senior_leadership || []) as any[];
        const directors = (data?.key_directors || []) as any[];
        const allPeople = [...leaders, ...directors];

        // If asking "who is the vice chancellor" → match by position
        const posMatch = allPeople.find((p: any) =>
          p.position && new RegExp(p.position.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(topicLower)
        );
        if (posMatch) {
          return `${posMatch.position}: ${posMatch.name}`;
        }
        // Fallback: list top leadership
        const top = leaders.slice(0, 4).map((p: any) => `${p.position}: ${p.name}`).join('; ');
        return `Top leadership — ${top}`;
      }

      case 'fees_and_scholarships': {
        const sch = data?.scholarships || {};
        const lines: string[] = [];
        if (sch.merit_based) {
          lines.push('Merit-based: ' + sch.merit_based.map((s: any) => `${s.percentage} → ${s.benefit}`).join('; '));
        }
        if (sch.sports) {
          lines.push('Sports: ' + sch.sports.map((s: any) => `${s.level} → ${s.benefit}`).join('; '));
        }
        if (sch.specially_abled) lines.push(`Specially abled: ${sch.specially_abled}`);
        if (sch.xopun_scheme_2026) {
          lines.push(`Xopun 2026 (EWS): ${sch.xopun_scheme_2026.description}. Deadline: ${sch.xopun_scheme_2026.deadline}`);
        }
        return lines.join('. ') || 'Scholarship information available on request.';
      }

      case 'rules_and_policies': {
        if (/attendance/i.test(topicLower) && data?.attendance) {
          const a = data.attendance;
          return `Minimum attendance required: ${a.minimum_required}. ${a.consequence}.`;
        }
        if (/ragging/i.test(topicLower)) return data.student_conduct || 'Ragging is strictly prohibited.';
        if (/backlog|promotion/i.test(topicLower)) {
          return (data.promotion_and_backlog || []).join(' ');
        }
        if (/examination/i.test(topicLower)) {
          return 'Exam process: ' + (data.examination_process || []).join(' → ');
        }
        return 'University rules available. Please ask about attendance, ragging policy, or backlog rules.';
      }

      case 'admissions': {
        if (/document/i.test(topicLower)) {
          return 'Required documents: ' + (data.required_documents || []).join(', ');
        }
        if (/process|apply|how to/i.test(topicLower)) {
          return 'Application steps: ' + (data.application_process || []).join(', ');
        }
        return 'Admission information available. Ask about required documents or application process.';
      }

      case 'academic_calendar': {
        const year = data?.academic_year || '2026-27';
        const odd = data?.odd_semester?.schedule || {};
        const even = data?.even_semester?.schedule || {};
        if (/start|begin|commence/i.test(topicLower)) {
          return `Academic year ${year}. Odd semester begins ${odd.semester_begins || 'July 2026'}. Even semester begins ${even.semester_begins || 'January 2027'}.`;
        }
        return `Academic year ${year}. Odd semester: ${data?.odd_semester?.start || 'July'} to ${data?.odd_semester?.end || 'December'}. Even semester: ${data?.even_semester?.start || 'January'} to ${data?.even_semester?.end || 'May/June'}.`;
      }

      case 'student_services': {
        const cells = data?.support_cells || [];
        if (/library/i.test(topicLower) && data?.library) {
          return `Library resources: ${data.library.resources?.slice(0, 5).join(', ')}.`;
        }
        if (/hostel/i.test(topicLower) && data?.hostel) {
          return `Hostel facilities: ${data.hostel.facilities?.slice(0, 5).join(', ')}.`;
        }
        if (/transport|bus/i.test(topicLower) && data?.transport) {
          return `Transport: ${data.transport.services?.join(', ')}.`;
        }
        return 'Student support: ' + cells.slice(0, 4).map((c: any) => c.name).join(', ');
      }

      case 'committees': {
        if (/anti[- ]?ragging/i.test(topicLower) && data?.anti_ragging) {
          const ar = data.anti_ragging;
          return `Anti-Ragging Committee: Chairperson ${ar.chairperson}, Member Secretary ${ar.member_secretary}. Members: ${ar.members?.slice(0, 4).join(', ')}.`;
        }
        if (/grievance/i.test(topicLower) && data?.student_grievance_redressal) {
          return `Student Grievance Redressal Committee members: ${data.student_grievance_redressal.members?.join(', ')}.`;
        }
        return 'Committees: Anti-Ragging, Student Grievance Redressal, Internal Complaints Committee.';
      }

      case 'university_metadata': {
        const c = data?.admission_contact || {};
        return `${data?.name || 'Assam down town University (AdtU)'}, ${data?.address || ''}. Admission contact: ${c.email || ''}, ${Array.isArray(c.phone) ? c.phone[0] : c.phone || ''}. Session: ${data?.admission_session || ''}.`;
      }

      default:
        return 'University information available. Please specify your question.';
    }
  } catch (e) {
    return 'University data retrieval error. Please try again or speak to a counsellor.';
  }
}
// ── Helper: Assam Down Town University Course & Fee Lookup ───────────────────
async function queryAdtuCourseInfo(courseName: string, degreeLevel?: string): Promise<string> {
  try {
    const query: any = {};
    if (degreeLevel && degreeLevel !== 'Any') {
      query.degreeLevel = degreeLevel;
    }

    const regex = new RegExp(courseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    let course = await AdtuCourse.findOne({
      ...query,
      $or: [{ courseName: regex }, { courseCode: regex }, { department: regex }, { specializations: regex }],
    });

    if (!course) {
      course = await AdtuCourse.findOne({
        $or: [{ courseName: regex }, { courseCode: regex }, { specializations: regex }],
      });
    }

    if (course) {
      return `[AdtU Course Data]: ${course.courseName} (${course.degreeLevel}) at Assam Down Town University. ` +
        `Total Tuition Fee: Rs. ${(course.totalTuitionFee / 100000).toFixed(2)} Lakhs (Rs. ${(course.annualTuitionFee / 100000).toFixed(2)} Lakhs per year). ` +
        `Duration: ${course.durationYears} Years (${course.durationSemesters} Semesters). ` +
        `Eligibility: ${course.eligibilityCriteria}. ` +
        `Specializations: ${(course.specializations || []).join(', ')}. ` +
        `Top Placement Partners: ${(course.placementPartners || []).slice(0, 4).join(', ')}.`;
    }
  } catch (e: any) {
    logger.warn(`⚠️ MongoDB course query error (${e?.message}) — using fallback course data.`);
  }

  const cLower = courseName.toLowerCase();
  if (cLower.includes('b.tech') || cLower.includes('cse') || cLower.includes('computer science engineering')) {
    return '[AdtU Course Data]: B.Tech in Computer Science & Engineering (CSE) at Assam Down Town University. Total Tuition Fee: Rs. 5.90 Lakhs (Rs. 1.47 Lakhs/year). Duration: 4 Years. Eligibility: Passed 10+2 PCM with min 50% aggregate marks. Specializations: AI & ML, Cyber Security, Cloud Computing. Placements: IBM, TCS, Wipro, Capgemini.';
  }
  if (cLower.includes('bca') || cLower.includes('bachelor of computer')) {
    return '[AdtU Course Data]: Bachelor of Computer Applications (BCA) at Assam Down Town University. Total Tuition Fee: Rs. 2.40 Lakhs (Rs. 80,000/year). Duration: 3 Years. Eligibility: Passed 10+2 in any stream with min 45% aggregate marks. Placements: Wipro, Tech Mahindra, Cognizant.';
  }
  if (cLower.includes('mca') || cLower.includes('master of computer')) {
    return '[AdtU Course Data]: Master of Computer Applications (MCA) at Assam Down Town University. Total Tuition Fee: Rs. 1.80 Lakhs (Rs. 90,000/year). Duration: 2 Years. Eligibility: Passed BCA or Graduation with Maths at 10+2/Degree level with min 50% aggregate marks. Placements: TCS, Wipro, IBM, Accenture.';
  }
  if (cLower.includes('mba') || cLower.includes('management') || cLower.includes('business administration')) {
    return '[AdtU Course Data]: Master of Business Administration (MBA) at Assam Down Town University. Total Tuition Fee: Rs. 3.60 Lakhs (Rs. 1.80 Lakhs/year). Duration: 2 Years. Eligibility: Graduation in any stream with min 50% aggregate marks + CAT/MAT/CMAT/AdtU Test. Specializations: Marketing, Finance, HR, Healthcare Management. Placements: HDFC Bank, ITC, Flipkart, Deloitte.';
  }
  if (cLower.includes('pharm') || cLower.includes('b.pharm')) {
    return '[AdtU Course Data]: Bachelor of Pharmacy (B.Pharm) at Assam Down Town University. Total Tuition Fee: Rs. 8.20 Lakhs (Rs. 2.05 Lakhs/year). PCI Approved. Duration: 4 Years. Eligibility: 10+2 PCB/PCM with min 60% aggregate marks. Placements: Sun Pharma, Cipla, Lupin, Apollo Pharmacy.';
  }
  if (cLower.includes('nursing') || cLower.includes('b.sc nursing')) {
    return '[AdtU Course Data]: B.Sc in Nursing at Assam Down Town University. Total Tuition Fee: Rs. 4.80 Lakhs (Rs. 1.20 Lakhs/year). INC Recognized. Duration: 4 Years. Eligibility: 10+2 PCB with min 45% aggregate marks. Placements: Apollo Hospitals, down town hospital, Fortis.';
  }

  return '[AdtU Course Data]: Assam Down Town University offers UG & PG programs across Engineering, Computer Applications, Management, Nursing, and Pharmacy. Fees range from Rs. 70,000/year to Rs. 2.05 Lakhs/year. Eligibility: 10+2 (45%-60%) for UG; Graduation (50%) for PG.';
}

// ── TTS text cleanup ─────────────────────────────────────────────────────────
function stripFunctionCallSyntax(text: string): string {
  return text
    .replace(/<function=\w+[^>]*>[\s\S]*?<\/function>/g, '')
    .replace(/<function=\w+[^>]*>/g, '')
    .replace(/<\/function>/g, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
    .replace(/\[TOOL_CALL\][\s\S]*?\[\/TOOL_CALL\]/g, '')
    .trim();
}

const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine',
  'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

function numToWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numToWords(n % 100) : '');
  return String(n); // phone numbers etc. — TTS reads digits naturally
}

function normalizeTextForTTS(text: string): string {
  if (!text || text.length < 2) return text;
  let result = text;
  // Remove markdown, emojis, and smart quotes
  result = result.replace(/[“”‘’"'`«»]/g, '');
  result = result.replace(/[;:\-–—\/\\|_*#~^`<>{}[\]()]/g, ' ');
  result = result.replace(/[🔥🔍📋✨⚡★●•→←↑↓▶◆■□]/g, '');
  result = result.replace(/₹/g, ' rupees ');
  result = result.replace(/\bRs\.?\s*/gi, ' rupees ');
  // Keep . ! ? , । for Sarvam TTS natural pauses and intonation
  return result.replace(/\s{2,}/g, ' ').trim();
}

// ── Job dedup ────────────────────────────────────────────────────────────────
const activeJobs = new Map<string, number>();
const JOB_DEDUP_TTL_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────────────
// Agent Implementation
// ─────────────────────────────────────────────────────────────────────────────
const agentDefinition = defineAgent({
  entry: async (ctx: JobContext) => {
    // 1. Extract metadata
    let meta: any = {};
    try {
      meta = JSON.parse(ctx.job.metadata ?? '{}');
    } catch (_) {}
    const phoneNumber: string | null = meta.phone_number ?? null;
    const roomName = ctx.job.room?.name ?? ctx.room.name ?? 'unknown-room';
    const callId = meta.call_id || `career-${Date.now()}`;
    const leadName = meta.lead_name ?? null;
    const leadId = meta.lead_id ?? null;
    const language = meta.language || process.env.SARVAM_LANGUAGE || 'hi-IN';

    logger.info(`🚀 Job started. Room: ${roomName}`);
    logger.info(`📱 Phone: ${phoneNumber ?? '(none)'}, Lead: ${leadName ?? 'unknown'}`);

    // Dedup guard
    const dedupKey = roomName;
    const now = Date.now();
    for (const [k, ts] of activeJobs) {
      if (now - ts > JOB_DEDUP_TTL_MS) activeJobs.delete(k);
    }
    if (activeJobs.has(dedupKey)) {
      logger.warn(`⚠️ Duplicate job for ${dedupKey} — skipping (already active)`);
      return;
    }
    activeJobs.set(dedupKey, now);

    // Early connect — ICE must fire within seconds or the SIP caller times out
    const connectPromise = ctx.connect().catch((err) => {
      logger.error('❌ Early connect failed:', err);
      throw err;
    });
    logger.info('⚡ Room connect initiated (async)...');

    // 2. Initialise plugins with per-call config from dashboard
    const stt = createDeepgramSTT({
      language,
      stt_model: meta.stt_model || process.env.STT_MODEL || 'nova-3',
    });
    const pace = meta.pace ? parseFloat(String(meta.pace)) : undefined;
    const tts = createSarvamTTS({
      voice: meta.voice || process.env.SARVAM_VOICE,
      model: meta.tts_model || process.env.SARVAM_MODEL,
      language,
      pace,
    });
    const llmConfig: any = meta.llm ?? {};
    if (meta.llm_model) llmConfig.model = meta.llm_model;
    const llm = createGroqLLM(llmConfig);

    // Pre-generate filler audio (played while LLM produces first tokens)
    const FILLER_TEXTS = ['haan ji, ek second', 'hmm, theek hai'];
    const fillers: Buffer[] = [];
    let fillerIdx = 0;
    Promise.all(FILLER_TEXTS.map((t) => tts.generate(normalizeTextForTTS(t)).catch(() => Buffer.alloc(0))))
      .then((bufs) => fillers.push(...bufs.filter((b) => b && b.length > 0)));

    // 3. Audio pipeline — AudioSource at Sarvam's 24kHz
    const sampleRate = tts.sampleRate ?? 24000;
    const audioSource = new AudioSource(sampleRate, 1);
    const localTrack = LocalAudioTrack.createAudioTrack('career-agent-audio', audioSource);
    logger.info(`🔊 AudioSource created at ${sampleRate} Hz`);

    // 4. Conversation state
    const systemPrompt = meta.system_prompt || buildSystemPrompt();
    const conversationHistory: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];
    let isSpeaking = false;
    let interrupted = false;
    let currentAbortController: AbortController | null = null;
    let callEnded = false;
    let transferring = false;
    let callAnswered = false;
    let lastAudioActivityMs = Date.now();
    let silenceWarningFired = false;
    let silenceGoodbyeInProgress = false;
    let silenceActionInProgress = false;
    let sttHealthy = false;
    let greetingPlaying = false;
    let activeTurnId: string | null = null;
    let playbackTurnId: string | null = null;
    const recentTranscriptTimes = new Map<string, number>();
    type ConversationStage = 'greeting' | 'open_questions' | 'qualification' | 'desired_course' | 'callback';
    const flowQuestions: Record<Exclude<ConversationStage, 'greeting'>, string> = {
      open_questions: 'Koi sawaal hai aapke mann mein admissions ke baare mein?',
      qualification: 'Aapki current qualification kya hai? 12th kaun se stream se kiya hai ya graduation?',
      desired_course: 'Kaun se course mein admission lena chahte hain Assam Down Town University mein?',
      callback: 'Hamare senior counsellor se detail mein baat karne ke liye, kab convenient rahega callback?',
    };
    let currentStage: ConversationStage = 'greeting';
    let pendingFlowQuestion = '';
    const greetingAbort = new AbortController();
    const callStartTime = Date.now();
    const maxDurationMs = parseInt(process.env.MAX_CALL_DURATION_MS || '720000', 10);
    const SILENCE_WARNING_MS = parseInt(process.env.SILENCE_WARNING_MS || '5000', 10);
    const SILENCE_TIMEOUT_MS = parseInt(process.env.SILENCE_TIMEOUT_MS || '10000', 10);
    const greetedParticipants = new Set<string>();

    // ✅ NEW: agentBusy tracks TTS generation time too (not just playback).
    // When the agent is generating TTS, the caller is expected to be quiet —
    // silence during TTS API calls should NOT count toward the 5s/10s budget.
    let agentBusy = false;

    // 5. Farewell detection
    const FAREWELL_PATTERNS =
      /^\s*(thank\s*you|bye|goodbye|good\s*bye|hang\s*up|end\s*the\s*call|cut\s*the\s*call|disconnect|bas|rakh\s*do|call\s*khatam|band\s*karo|phone\s*rakho|theek\s*hai\s*bye|okay\s*bye|accha\s*bye|chal\s*bye|tata|alvida|shukriya|dhanyavaad|dhonyobad|nandri|aavjo|namaste.*bye|vanakkam.*bye|namaskar.*bye)\s*[.!?]*\s*$/i;
    const checkFarewell = (text: string): boolean => {
      const trimmed = text.trim();
      if (trimmed.length > 60) return false;
      if (FAREWELL_PATTERNS.test(trimmed)) {
        logger.info(`👋 Farewell detected: "${trimmed}"`);
        return true;
      }
      return false;
    };

    // 6. Chunked PCM playback — 100ms chunks with real-time WebRTC frame pacing
    const CHUNK_DURATION_MS = 100;
    const SAMPLES_PER_CHUNK = Math.floor((sampleRate * CHUNK_DURATION_MS) / 1000);

    const playPcm = async (pcmBuffer: Buffer, abortSignal?: AbortSignal, turnId: string = 'SYSTEM') => {
      if (abortSignal?.aborted || interrupted) return;
      const totalSamples = pcmBuffer.byteLength / 2;
      if (totalSamples === 0) return;

      if (turnId !== 'SYSTEM' && activeTurnId && activeTurnId !== turnId) {
        logger.warn(`[STALE_AUDIO] playbackTurnId=${turnId} activeTurnId=${activeTurnId}`);
      }
      playbackTurnId = turnId;
      turnLog(turnId, 'TTS_PLAYBACK_START', { timestamp: new Date().toISOString(), bytes: pcmBuffer.length });

      const int16Data = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, totalSamples);
      let offset = 0;
      while (offset < totalSamples) {
        if (turnId !== 'SYSTEM' && activeTurnId !== turnId) {
          logger.warn(`[STALE_AUDIO] playbackTurnId=${turnId} activeTurnId=${activeTurnId || 'none'}`);
          playbackTurnId = null;
          return;
        }
        if (abortSignal?.aborted || interrupted) {
          logger.info(`🛑 Playback interrupted at ${offset}/${totalSamples} samples`);
          playbackTurnId = null;
          return;
        }
        const chunkSamples = Math.min(SAMPLES_PER_CHUNK, totalSamples - offset);
        const frameDurationMs = (chunkSamples / sampleRate) * 1000;
        const frame = new AudioFrame(int16Data.slice(offset, offset + chunkSamples), sampleRate, 1, chunkSamples);
        
        const startTime = Date.now();
        try {
          await audioSource.captureFrame(frame);
        } catch (err: any) {
          logger.warn(`⚠️ captureFrame error (non-fatal): ${err.message || err}`);
          playbackTurnId = null;
          return;
        }
        offset += chunkSamples;

        // Pacing: wait for frame duration (minus 5ms safety margin for jitter)
        // so WebRTC receives audio at exact real-time speed. Prevents packet drops / muted words.
        const elapsed = Date.now() - startTime;
        const sleepMs = Math.max(0, Math.floor(frameDurationMs - elapsed - 5));
        if (sleepMs > 0) {
          await sleep(sleepMs);
        }
      }
      playbackTurnId = null;
    };

    const speak = async (text: string, abortSignal?: AbortSignal, turnId: string = 'SYSTEM') => {
      if (!text || abortSignal?.aborted || interrupted) return;
      agentBusy = true;
      turnLog(turnId, 'AGENT_BUSY_CHANGE', { value: true });
      try {
        const normalizedText = normalizeTextForTTS(text);
        turnLog(turnId, 'TTS_TEXT_BEFORE_NORMALIZE', { text });
        turnLog(turnId, 'TTS_TEXT_AFTER_NORMALIZE', { text: normalizedText });
        turnLog(turnId, 'TTS_GENERATE_START', { timestamp: new Date().toISOString(), textLength: normalizedText.length });
        const pcm = await tts.generate(normalizedText, abortSignal, { turnId });
        if (pcm?.length > 0 && !abortSignal?.aborted && !interrupted) {
          await playPcm(pcm, abortSignal, turnId);
        }
      } finally {
        agentBusy = false;
        turnLog(turnId, 'AGENT_BUSY_CHANGE', { value: false });
      }
    };

    const speakFlowQuestion = async (turnId: string = 'SYSTEM', abortSignal?: AbortSignal) => {
      if (!pendingFlowQuestion || abortSignal?.aborted || interrupted) return;
      turnLog(turnId, 'FLOW_QUESTION', { stage: currentStage, text: pendingFlowQuestion });
      conversationHistory.push({ role: 'assistant', content: pendingFlowQuestion });
      await speak(pendingFlowQuestion, abortSignal, turnId);
    };

    type Intent = 'ACKNOWLEDGMENT' | 'UNIVERSITY_Q' | 'COURSE_Q' | 'FLOW_ANSWER' | 'TRANSFER_REQ' | 'OTHER';
    const VALID_INTENTS = new Set<Intent>(['ACKNOWLEDGMENT', 'UNIVERSITY_Q', 'COURSE_Q', 'FLOW_ANSWER', 'TRANSFER_REQ', 'OTHER']);

    const extractCourseName = (text: string): string | null => {
      const normalized = text.toLowerCase();
      if (normalized.includes('bca')) return 'BCA';
      if (normalized.includes('b.tech') || normalized.includes('btech') || normalized.includes('cse') || normalized.includes('computer science')) return 'B.Tech CSE';
      if (normalized.includes('mca')) return 'MCA';
      if (normalized.includes('mba')) return 'MBA';
      if (normalized.includes('b.pharm') || normalized.includes('bpharm') || normalized.includes('pharmacy')) return 'B.Pharm';
      if (normalized.includes('nursing')) return 'B.Sc Nursing';
      if (normalized.includes('bba')) return 'BBA';
      if (normalized.includes('bmlt') || normalized.includes('medical laboratory')) return 'BMLT';
      return null;
    };

    const classifyIntentFallback = (text: string, stage: ConversationStage): Intent => {
      const normalized = text.toLowerCase().trim();
      if (normalized.includes('human') || normalized.includes('counsellor') || normalized.includes('counselor') || normalized.includes('transfer')) return 'TRANSFER_REQ';
      if (normalized.includes('vice chancellor') || normalized.includes('scholarship') || normalized.includes('hostel') || normalized.includes('attendance') || normalized.includes('ragging') || normalized.includes('library') || normalized.includes('transport') || normalized.includes('committee') || normalized.includes('admission process') || normalized.includes('document')) return 'UNIVERSITY_Q';
      if (normalized.includes('fee') || normalized.includes('fees') || normalized.includes('eligibility') || normalized.includes('duration') || normalized.includes('tuition')) return 'COURSE_Q';
      if (stage === 'desired_course' && extractCourseName(text)) return 'FLOW_ANSWER';
      if (stage === 'qualification' || stage === 'callback') return 'FLOW_ANSWER';
      if (['yes', 'yeah', 'yep', 'okay', 'ok', 'ji', 'haan', 'han', 'sure', 'hello', 'thanks', 'thank you'].includes(normalized)) return 'ACKNOWLEDGMENT';
      return 'OTHER';
    };

    const classifyIntent = async (text: string, stage: ConversationStage, signal: AbortSignal, turnId: string): Promise<Intent> => {
      const fallback = classifyIntentFallback(text, stage);
      const messages = [
        {
          role: 'system' as const,
          content: 'Classify the caller utterance. Return only JSON: {"intent":"ACKNOWLEDGMENT|UNIVERSITY_Q|COURSE_Q|FLOW_ANSWER|TRANSFER_REQ|OTHER"}. ACKNOWLEDGMENT means yes/okay/name/thanks. UNIVERSITY_Q means university facts. COURSE_Q means fees, eligibility, duration, or a course question. FLOW_ANSWER means an answer to the current flow stage. TRANSFER_REQ means asking for a human. Do not call tools.',
        },
        { role: 'user' as const, content: `Current stage: ${stage}. Caller: ${text}` },
      ];
      let raw = '';
      try {
        for await (const chunk of llm.generateStream(messages, signal, [], { turnId }, { temperature: 0, maxTokens: 50 })) {
          if (signal.aborted) return fallback;
          if (chunk.type === 'content') raw += chunk.content || '';
        }
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        const parsed = start >= 0 && end > start ? JSON.parse(raw.slice(start, end + 1)) : null;
        const intent = parsed?.intent as Intent | undefined;
        if (intent && VALID_INTENTS.has(intent)) return intent;
      } catch (error: any) {
        logger.warn(`Intent classifier failed; using deterministic fallback: ${error?.message || error}`);
      }
      return fallback;
    };

    const generateNoToolResponse = async (userText: string, signal: AbortSignal, turnId: string, factualInfo?: string): Promise<string> => {
      const messages = [
        {
          role: 'system' as const,
          content: factualInfo
            ? `Use this factual information to answer the caller in 1-2 short, natural sentences. Do not mention tools or databases. FACTS: ${factualInfo}`
            : 'Respond to the caller in 1-2 short, natural sentences. Do not ask an admission-flow question; the system controls the flow.',
        },
        { role: 'user' as const, content: userText },
      ];
      let response = '';
      for await (const chunk of llm.generateStream(messages, signal, [], { turnId })) {
        if (signal.aborted) break;
        if (chunk.type === 'content') response += chunk.content || '';
      }
      return stripFunctionCallSyntax(response.trim());
    };

    // 7. Call status notify → career server
    let statusNotified = false;
    const notifyCallStatus = async (status: 'completed' | 'failed' | 'busy' | 'no-answer', failReason?: string) => {
      if (statusNotified) return;
      statusNotified = true;
      try {
        const serverUrl = process.env.CAREER_SERVER_URL || `http://localhost:${process.env.PORT || 5100}`;
        const url = `${serverUrl}/api/voice/webhook/call-status`;
        const payload = JSON.stringify({
          call_id: callId,
          phone: phoneNumber || 'unknown',
          room_name: roomName,
          status,
          duration: Math.round((Date.now() - callStartTime) / 1000),
          error: failReason || undefined,
        });
        const httpClient = url.startsWith('https') ? https : http;
        await new Promise<void>((resolve) => {
          const req = httpClient.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
            timeout: 8000,
          }, (res) => {
            res.resume();
            res.on('end', () => {
              logger.info(`📡 Call status notified: ${status}${failReason ? ` (${failReason})` : ''}`);
              resolve();
            });
          });
          req.on('error', (e) => {
            logger.warn(`⚠️ Call status notify failed: ${e.message}`);
            resolve();
          });
          req.on('timeout', () => { req.destroy(); resolve(); });
          req.write(payload);
          req.end();
        });
      } catch (e: any) {
        logger.warn(`⚠️ notifyCallStatus error: ${e.message}`);
      }
    };

    // 8. endCall — ✅ FIXED: close STT FIRST to prevent ghost transcripts
    const endCall = async (reason: string) => {
      if (callEnded) return;
      callEnded = true;
      clearInterval(silenceCheckInterval);

      // ✅ Close STT IMMEDIATELY — prevents ghost transcripts after hangup.
      // Previously stt.close() ran at line 951, way too late. The logs showed
      // transcripts arriving 10-20s after "Ending call" because Deepgram was
      // still connected and streaming.
      try { stt.close(); } catch {}

      logger.info(`📴 Ending call. Reason: ${reason}`);

      // Stop all playback cleanly
      interrupted = true;
      greetingAbort.abort();
      if (currentAbortController) {
        turnLog(activeTurnId || 'SYSTEM', 'ABORT_CONTROLLER_ABORT', { reason: 'call-ended', timestamp: new Date().toISOString() });
        try { currentAbortController.abort(); } catch {}
      }

      const hadConversation = conversationHistory.some((m) => m.role === 'user');
      const transcript = conversationHistory
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => `${m.role === 'user' ? 'CALLER' : 'AGENT'}: ${m.content}`)
        .join('\n');
      const durationS = Math.round((Date.now() - callStartTime) / 1000);

      // Post-call lead extraction & Gemini 3.6 Flash Summary
      const geminiSummary = await generateGeminiSummary(transcript, leadName || 'Prospect Student');

      const record: LeadRecord = {
        call_id: callId,
        lead_id: leadId || undefined,
        lead_name: leadName || undefined,
        phone: phoneNumber || 'unknown',
        status: hadConversation
          ? (reason === 'farewell' || reason === 'transferred' ? 'interested' : reason)
          : reason,
        duration_s: durationS,
        transcript: `${transcript}\n\n[GEMINI 3.6 FLASH SUMMARY]: ${geminiSummary.summaryText}`,
        created_at: new Date().toISOString(),
      };
      await saveLead(record).catch((e) => logger.warn(`⚠️ saveLead failed: ${e?.message}`));

      // 💾 Save to MongoDB Atlas AdtuLead Collection
      try {
        await AdtuLead.findOneAndUpdate(
          { callId },
          {
            callId,
            leadId: leadId || undefined,
            leadName: leadName || 'Prospect Student',
            phone: phoneNumber || 'unknown',
            status: reason === 'transferred' ? 'transferred' : (hadConversation ? 'completed' : 'no_answer'),
            durationSeconds: durationS,
            fullTranscript: transcript,
            conversation: conversationHistory,
            geminiSummary,
            pushedToSheets: true,
          },
          { upsert: true, new: true }
        );
        logger.info(`💾 Saved AdtU Lead & Gemini 3.6 Flash summary to MongoDB Atlas`);
      } catch (e: any) {
        logger.warn(`⚠️ MongoDB AdtuLead save warning: ${e?.message}`);
      }

      const failStatus = reason === 'caller_hangup' ? 'no-answer'
        : reason === 'dial_busy' ? 'busy'
        : reason === 'dial_unavailable' ? 'no-answer'
        : reason === 'dial_rejected' ? 'failed'
        : reason === 'dial_failed' ? 'failed'
        : 'completed';
      await notifyCallStatus(hadConversation ? 'completed' : failStatus, reason);

      // Remove SIP participant via LiveKit API (proven pattern).
      // Skipped for transfers — the SIP transfer API already moved the caller
      // out of the room; removing the participant here could race with the
      // transfer and kill the caller ↔ human leg.
      if (reason !== 'transferred') {
        try {
          const roomSvc = new RoomServiceClient(
            process.env.LIVEKIT_URL!,
            process.env.LIVEKIT_API_KEY!,
            process.env.LIVEKIT_API_SECRET!,
          );
          const participants = await roomSvc.listParticipants(roomName);
          for (const p of participants) {
            if (p.identity.startsWith('sip_')) {
              logger.info(`📴 Removing SIP participant: ${p.identity}`);
              try {
                await roomSvc.removeParticipant(roomName, p.identity);
              } catch (e: any) {
                logger.warn(`⚠️ Could not remove ${p.identity}: ${e?.message}`);
              }
            }
          }
        } catch (e: any) {
          logger.warn(`⚠️ Could not list/remove participants: ${e?.message}`);
        }
      }

      await sleep(500);
      try {
        await ctx.room.disconnect();
      } catch (_) {}
    };

    // 9. Silence + max-duration watchdog
    // ✅ FIXED: checks agentBusy (covers TTS generation time, not just playback)
    // ✅ FIXED: reduced poll interval from 2000ms to 1500ms for tighter detection
    const silenceCheckInterval = setInterval(async () => {
      // Never count silence while the agent is busy (speaking OR generating TTS)
      if (callEnded || isSpeaking || agentBusy || greetingPlaying || !callAnswered || silenceActionInProgress) return;

      const elapsed = Date.now() - callStartTime;
      if (elapsed > maxDurationMs && !silenceGoodbyeInProgress) {
        silenceActionInProgress = true;
        silenceGoodbyeInProgress = true;
        logger.info('⏱️ Max call duration reached — ending call');
        await speak('Thank you so much for your time. Our senior counsellor will connect with you. Have a great day!');
        await sleep(2000);
        if (silenceGoodbyeInProgress) {
          await endCall('max_duration');
        } else {
          silenceActionInProgress = false;
          logger.info('🔄 Caller spoke during farewell — conversation continues');
        }
        return;
      }

      if (!sttHealthy) return;

      const silenceMs = Date.now() - lastAudioActivityMs;
      if (silenceMs >= SILENCE_TIMEOUT_MS && !silenceGoodbyeInProgress) {
        silenceActionInProgress = true;
        silenceGoodbyeInProgress = true;
        logger.info(`🔇 ${(silenceMs / 1000).toFixed(0)}s of user silence — saying bye and hanging up`);
        conversationHistory.push({ role: 'assistant', content: 'Okay, thank you, bye!' });
        await speak('Okay, thank you, bye!');
        if (silenceGoodbyeInProgress) {
          await endCall('silence_timeout');
        } else {
          silenceActionInProgress = false;
          logger.info('🔄 Caller spoke during the bye — conversation continues');
        }
        return;
      }
      if (silenceMs >= SILENCE_WARNING_MS && !silenceWarningFired) {
        silenceWarningFired = true;
        silenceActionInProgress = true;
        logger.info(`🔇 ${(silenceMs / 1000).toFixed(0)}s of user silence — asking "kya aap abhi bhi line par hai?"`);
        try {
          await speak('Hello? Kya aap abhi bhi line par hai?');
        } finally {
          silenceActionInProgress = false;
        }
      }
    }, 1500); // ✅ 1500ms poll (was 2000ms) — tighter detection

    // 10. Filler gate (Hindi + Devanagari fillers)
    const FILLER_WORDS = new Set([
      'okay','ok','uh','hmm','hm','yeah','yes','no','um','ah','oh','right','sure',
      'fine','good','haan','han','theek','theek hai','accha','ji','ha',
      'हाँ','हां','हाँ जी','जी','ठीक','ठीक है','अच्छा','अरे','नमस्ते',
    ]);

    // 11. STT → LLM → TTS pipeline (clause-level streaming + barge-in)
    let errorResumeCount = 0;

    const handleUserQuery = async (text: string, isSystemResume: boolean = false) => {
      const turnId = newTurnId();
      const turnStart = Date.now();
      if (playbackTurnId && playbackTurnId !== turnId) {
        logger.warn(`[STALE_AUDIO] cancelling playbackTurnId=${playbackTurnId} for newTurnId=${turnId}`);
        interrupted = true;
        if (currentAbortController) {
          turnLog(activeTurnId || playbackTurnId, 'ABORT_CONTROLLER_ABORT', { reason: 'new-turn-stale-audio', timestamp: new Date().toISOString() });
          currentAbortController.abort();
          currentAbortController = null;
        }
        playbackTurnId = null;
        isSpeaking = false;
        agentBusy = false;
      }
      const priorTranscriptAt = recentTranscriptTimes.get(text);
      recentTranscriptTimes.set(text, turnStart);
      if (!isSystemResume && priorTranscriptAt && turnStart - priorTranscriptAt <= 3000) {
        logger.warn(`[DUP_TRANSCRIPT] turnId=${turnId} text=${JSON.stringify(text)} elapsedMs=${turnStart - priorTranscriptAt}`);
      }
      turnLog(turnId, 'TURN_START', {
        userInput: text.substring(0, 100),
        isSystemResume,
        conversationHistoryLength: conversationHistory.length,
        isSpeaking,
        agentBusy,
        greetingPlaying,
        callAnswered,
      });
      if (!isSystemResume && (!text || text.trim().length < 3)) return;
      if (callEnded || transferring) return;

      const transcriptLower = text.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim();
      if (!isSystemResume && FILLER_WORDS.has(transcriptLower)) {
        logger.info(`🔇 Dropped filler: "${text}"`);
        interrupted = false;
        return;
      }

      if (!isSystemResume) {
        lastAudioActivityMs = Date.now();
        silenceWarningFired = false;
        errorResumeCount = 0;
      }
      if (silenceGoodbyeInProgress) {
        silenceGoodbyeInProgress = false;
        logger.info('🔄 User spoke during goodbye — cancelling hangup');
      }

      // Stop greeting if still playing
      if (greetingPlaying) {
        greetingAbort.abort();
        logger.info('🛑 Greeting stopped by caller speech');
      }

      // BARGE-IN: abort current speech
      if (isSpeaking) {
        logger.info(`🛑 Interruption detected! User said: "${text}"`);
        turnLog(turnId, 'IS_SPEAKING_CHANGE', { value: false, reason: 'barge-in' });
        interrupted = true;
        isSpeaking = false;
        if (currentAbortController) {
          turnLog(activeTurnId || turnId, 'ABORT_CONTROLLER_ABORT', { reason: 'barge-in', timestamp: new Date().toISOString() });
          currentAbortController.abort();
          currentAbortController = null;
        }
        // Flush silence frame
        try {
          const silenceSamples = sampleRate * 0.05;
          const silenceFrame = new AudioFrame(new Int16Array(silenceSamples), sampleRate, 1, silenceSamples);
          await audioSource.captureFrame(silenceFrame).catch(() => {});
        } catch {}
      }

      if (!isSystemResume) {
        turnLog(turnId, 'HISTORY_PUSH_USER', { textLength: text.length });
        conversationHistory.push({ role: 'user', content: text });
      }

      isSpeaking = true;
      interrupted = false;
      agentBusy = true;
      activeTurnId = turnId;
      turnLog(turnId, 'IS_SPEAKING_CHANGE', { value: true });
      turnLog(turnId, 'AGENT_BUSY_CHANGE', { value: true });
      turnLog(turnId, 'ABORT_CONTROLLER_CREATE');
      const myController = new AbortController();
      currentAbortController = myController;
      const signal = myController.signal;

      // Trim history — head 3 + tail 14
      if (conversationHistory.length > 20) {
        const head = conversationHistory.slice(0, 3);
        const tail = conversationHistory.slice(-14);
        conversationHistory.length = 0;
        conversationHistory.push(...head, ...tail);
        logger.info(`✂️ Trimmed conversation history to ${conversationHistory.length} messages`);
      }

      // Filler masking — reduced from 1200ms to 800ms for faster filler
      let firstTokenArrived = false;
      let fillerActive: Promise<void> | null = null;
      let fillerTimer: NodeJS.Timeout | null = null;
      fillerTimer = setTimeout(() => {
        if (!firstTokenArrived && !signal.aborted && !interrupted && fillers.length > 0) {
          fillerActive = playPcm(fillers[fillerIdx++ % fillers.length], signal).catch(() => {});
        }
      }, 800); // ✅ 800ms (was 1200ms)

      // 30s safety net for stuck LLM
      let llmTimedOut = false;
      const firstTokenTimeout = setTimeout(() => {
        if (!firstTokenArrived) {
          llmTimedOut = true;
          logger.error('⏱️ LLM first-token timeout (30s) — aborting turn');
          turnLog(turnId, 'ABORT_CONTROLLER_ABORT', { reason: 'first-token-timeout', timestamp: new Date().toISOString() });
          try { myController.abort(); } catch {}
        }
      }, 30000);

      let fullResponse = '';
      let groqRequestStart = 0;
      let firstTokenMs: number | null = null;
      let mongoMs = 0;
      let ttsMs = 0;
      let llmRequests = 0;
      try {
        groqRequestStart = Date.now();
        llmRequests++;
        turnLog(turnId, 'GROQ_REQUEST_START', {
          userMessage: text,
          historyLength: conversationHistory.length,
          toolsCount: 0,
        });
        const intent = await classifyIntent(text, currentStage, signal, turnId);
        turnLog(turnId, 'INTENT_CLASSIFIED', { intent, stage: currentStage });
        if (fillerTimer) { clearTimeout(fillerTimer); fillerTimer = null; }
        if (signal.aborted) return;

        const advanceStage = async (acknowledgement?: string) => {
          if (acknowledgement) await speak(acknowledgement, signal, turnId);
          if (currentStage === 'callback') {
            await speak('Thank you ji. Hamara senior counsellor aapse aapke convenient time par baat karega. Have a good day!', signal, turnId);
            await endCall('callback_captured');
            return;
          }
          const from = currentStage;
          const nextStage: ConversationStage = currentStage === 'open_questions'
            ? 'qualification'
            : currentStage === 'qualification'
              ? 'desired_course'
              : 'callback';
          currentStage = nextStage;
          pendingFlowQuestion = flowQuestions[nextStage];
          turnLog(turnId, 'STAGE_ADVANCE', { from, to: nextStage });
          await speakFlowQuestion(turnId, signal);
        };

        const speakResponse = async (response: string) => {
          fullResponse = response;
          if (!response || signal.aborted) return;
          conversationHistory.push({ role: 'assistant', content: response });
          turnLog(turnId, 'FINAL_RESPONSE', { text: response, length: response.length, timestamp: new Date().toISOString() });
          const ttsStartedAt = Date.now();
          await speak(response, signal, turnId);
          ttsMs += Date.now() - ttsStartedAt;
        };

        if (intent === 'TRANSFER_REQ') {
          await speak('Aapko hamare senior admissions counsellor se connect kar rahi hoon, please line par rahein.', signal, turnId);
          await sleep(1500);

          // ✅ TRUE transfer (not a conference): stop the agent's ears and
          // voice processing IMMEDIATELY — no more STT → LLM → TTS tokens —
          // then move the SIP caller out of the room via LiveKit's SIP
          // transfer API so they connect DIRECTLY to the human. The agent
          // disconnects and never joins the transferred leg.
          transferring = true;
          try { stt.close(); } catch {}

          let sipIdentity: string | null = null;
          for (const p of ctx.room.remoteParticipants.values()) {
            if (p.identity.startsWith('sip_')) { sipIdentity = p.identity; break; }
          }

          const transferTo = process.env.TRANSFER_TO_NUMBER || '+917085803754';
          if (sipIdentity) {
            try {
              const sipClient = new SipClient(
                process.env.LIVEKIT_URL!,
                process.env.LIVEKIT_API_KEY!,
                process.env.LIVEKIT_API_SECRET!,
              );
              await sipClient.transferSipParticipant(roomName, sipIdentity, transferTo);
              logger.info(`📞 Caller ${sipIdentity} transferred to ${transferTo} — agent leaving the call`);
            } catch (e: any) {
              logger.error(`❌ SIP transfer failed: ${e?.message || e}`);
              await speak('Maafi chahti hoon, abhi connect nahi ho paya. Hamara senior counsellor aapko wapas call karega. Thank you!', signal, turnId);
              await endCall('transfer_failed');
              return;
            }
          } else {
            logger.warn('⚠️ No SIP participant in room — cannot transfer call');
            await endCall('transfer_failed');
            return;
          }

          await endCall('transferred');
          return;
        }

        if (intent === 'ACKNOWLEDGMENT') {
          await advanceStage();
          return;
        }

        if (intent === 'FLOW_ANSWER') {
          const selectedCourse = currentStage === 'desired_course' ? extractCourseName(text) : null;
          if (selectedCourse) {
            const lookupStartedAt = Date.now();
            const info = await queryAdtuCourseInfo(selectedCourse, 'Any');
            mongoMs += Date.now() - lookupStartedAt;
            turnLog(turnId, 'TOOL_LOOKUP_COMPLETE', { toolName: 'query_course_fees_eligibility', resultLength: info.length, lookupTime: Date.now() - lookupStartedAt });
            llmRequests++;
            const response = await generateNoToolResponse(text, signal, turnId, info);
            await speakResponse(response);
          }
          await advanceStage(currentStage === 'qualification' ? 'Bahut badhiya, noted.' : undefined);
          return;
        }

        if (intent === 'UNIVERSITY_Q' || intent === 'COURSE_Q') {
          const lookupStartedAt = Date.now();
          const toolName = intent === 'UNIVERSITY_Q' ? 'query_university_info' : 'query_course_fees_eligibility';
          const info = intent === 'UNIVERSITY_Q'
            ? await queryUniversityInfo(text)
            : await queryAdtuCourseInfo(extractCourseName(text) || text, 'Any');
          mongoMs += Date.now() - lookupStartedAt;
          turnLog(turnId, 'TOOL_LOOKUP_COMPLETE', { toolName, resultLength: info.length, lookupTime: Date.now() - lookupStartedAt });
          llmRequests++;
          const response = await generateNoToolResponse(text, signal, turnId, info);
          await speakResponse(response);
          const bridgePhrase = currentStage === 'qualification'
            ? 'Ab batayein, aapki current qualification kya hai?'
            : currentStage === 'desired_course'
              ? 'Ab batayein, kaun se course mein interested hain aap?'
              : currentStage === 'callback'
                ? 'Ab batayein, callback ke liye kab convenient rahega?'
                : pendingFlowQuestion;
          await speak(bridgePhrase, signal, turnId);
          return;
        }

        const response = await generateNoToolResponse(text, signal, turnId);
        await speakResponse(response);
        await speakFlowQuestion(turnId, signal);
      } catch (err: any) {
        if (fillerTimer) { clearTimeout(fillerTimer); fillerTimer = null; }

        // Barge-in: a newer turn now owns the conversation
        if (currentAbortController !== myController) {
          isSpeaking = false;
          agentBusy = false;
          return;
        }

        if (err.name === 'AbortError' || signal.aborted) {
          turnError(turnId, 'TURN_ABORTED', new Error('barge-in or user interrupt'));
          if (llmTimedOut) {
            logger.error('⏱️ LLM first-token timeout — ending the call gracefully');
            await speak('Sorry, network problem hai. Hamara counsellor aapko wapas call karega. Thank you!');
            await endCall('llm_timeout');
          } else {
            logger.info('🛑 Turn aborted (barge-in). Waiting for the caller to finish.');
          }
        } else if (err?.status === 400 || err?.status === 404 || err?.code === 'model_not_found' || err?.code === 'invalid_request_error') {
          logger.error(`❌ FATAL LLM error (${err?.status || err?.code}): ${err?.message || err}. Ending call.`);
          await speak('Sorry, technical issue hai. Hamara counsellor aapko wapas call karega. Thank you!');
          await endCall('llm_error');
        } else if (err?.status === 429 || err?.code === 'rate_limit_exceeded') {
          if (errorResumeCount >= 1) {
            logger.error('❌ Rate limit hit again — ending the call gracefully');
            await speak('Sorry, network busy hai. Hamara counsellor aapko wapas call karega. Thank you!');
            await endCall('llm_error');
          } else {
            errorResumeCount++;
            logger.warn('⚠️ Rate limit hit — recovering conversation');
            conversationHistory.push({
              role: 'system',
              content: '[INSTRUCTION]: Briefly say "main thoda busy hoon, ek second" in Hinglish, then continue the conversation naturally. NEVER go silent.',
            });
              isSpeaking = false;
              agentBusy = false;
              turnLog(turnId, 'TOOL_CONTINUATION_SCHEDULED', { delay: 50 });
              setTimeout(() => handleUserQuery('', true), 50);
            return;
          }
        } else {
          if (errorResumeCount >= 1) {
            logger.error('❌ LLM error repeated — ending the call gracefully');
            await speak('Sorry, technical issue hai. Hamara counsellor aapko wapas call karega. Thank you!');
            await endCall('llm_error');
          } else {
            errorResumeCount++;
            logger.error('❌ LLM pipeline error (transient — single retry):', err?.message || err);
            conversationHistory.push({
              role: 'system',
              content: '[INSTRUCTION]: Apologise briefly in Hinglish and ask the user to repeat. NEVER go silent.',
            });
            isSpeaking = false;
            agentBusy = false;
            turnLog(turnId, 'TOOL_CONTINUATION_SCHEDULED', { delay: 50 });
            setTimeout(() => handleUserQuery('', true), 50);
            return;
          }
        }
        isSpeaking = false;
        agentBusy = false;
        return;
      } finally {
        clearTimeout(firstTokenTimeout);
        turnLog(turnId, 'SUMMARY', {
          sttToLlmMs: groqRequestStart ? groqRequestStart - turnStart : null,
          firstTokenMs,
          totalLlmMs: groqRequestStart ? Date.now() - groqRequestStart : null,
          mongoMs,
          ttsMs,
          totalTurnMs: Date.now() - turnStart,
        });
        turnLog(turnId, 'TURN_COMPLETE', {
          totalDuration: Date.now() - turnStart,
          finalResponseLength: fullResponse.length,
        });
      }

      isSpeaking = false;
      agentBusy = false;
      lastAudioActivityMs = Date.now();
    };

    // 12. Wire STT events + room audio
    stt.on('transcript', (text: string) => {
      if (callEnded || transferring) return; // ✅ Drop transcripts after call ended / during transfer
      if (playbackTurnId) {
        logger.warn(`[OVERLAP] finalTranscript=${JSON.stringify(text)} playbackTurnId=${playbackTurnId} activeTurnId=${activeTurnId || 'none'}`);
      }
      logger.info(`🗣️ User said: "${text}"`);
      handleUserQuery(text);
    });

    stt.on('interimTranscript', (text: string) => {
      const trimmed = (text || '').trim();
      if (trimmed.length < 2 || callEnded || transferring) return;
      lastAudioActivityMs = Date.now();
      const words = trimmed.split(/\s+/).length;
      const isRealSpeech = words >= 2 || trimmed.length >= 6;
      if ((isSpeaking || greetingPlaying) && isRealSpeech) {
        if (isSpeaking) {
          interrupted = true;
          turnLog(activeTurnId || 'SYSTEM', 'IS_SPEAKING_CHANGE', { value: false, reason: 'interim-barge-in' });
          isSpeaking = false;
          if (currentAbortController) {
            turnLog(activeTurnId || 'SYSTEM', 'ABORT_CONTROLLER_ABORT', { reason: 'interim-barge-in', timestamp: new Date().toISOString() });
            currentAbortController.abort();
            currentAbortController = null;
          }
        }
        if (greetingPlaying) greetingAbort.abort();
        if (silenceGoodbyeInProgress) {
          silenceGoodbyeInProgress = false;
          logger.info('🔄 Caller speaking during the bye (interim) — cancelling hangup');
        }
        logger.info(`🛑 Barge-in (interim): "${trimmed.slice(0, 80)}"`);
        try {
          const silenceSamples = sampleRate * 0.05;
          const silenceFrame = new AudioFrame(new Int16Array(silenceSamples), sampleRate, 1, silenceSamples);
          audioSource.captureFrame(silenceFrame).catch(() => {});
        } catch {}
      } else {
        logger.info(`🎙️ Deepgram interim: "${trimmed.slice(0, 80)}"`);
      }
    });

    // STT health tracking
    stt.on('connected', () => {
      sttHealthy = true;
      logger.info('✅ STT online — silence watchdog armed');
    });
    stt.on('disconnected', () => {
      sttHealthy = false;
    });
    stt.on('sttFailed', async () => {
      if (callEnded) return;
      logger.error('❌ STT permanently down — ending the call (deaf agent)');
      if (callAnswered && !isSpeaking && !greetingPlaying) {
        try {
          await speak('Maafi chahti hoon, technical issue ki wajah se main aapko sun nahi pa rahi. Humara counsellor aapko wapas call karega. Thank you!');
        } catch (_) {}
      }
      await endCall('stt_failure');
    });

    const handleTrackSubscribed = (
      // Node16 resolves LiveKit's ESM and CJS declarations separately. These
      // event arguments come from the same runtime SDK, so keep them opaque at
      // this boundary instead of mixing the two declaration copies.
      track: any,
      _publication: any,
      participant: any,
    ) => {
      if (track.kind !== TrackKind.KIND_AUDIO) return;
      logger.info(`🎤 Subscribed to audio from: ${participant.identity}`);

      handleParticipantConnected(participant).catch((err) =>
        logger.error('[CareerWorker] Error in fallback greeting:', err),
      );

      const audioStream = new AudioStream(track, { sampleRate: 48000, numChannels: 1 });
      const reader = audioStream.getReader();
      const readLoop = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done || callEnded) break; // ✅ Stop reading after call ended
            if (value) {
              const buffer = Buffer.from(value.data.buffer, value.data.byteOffset, value.data.byteLength);
              stt.pushAudio(buffer);
            }
          }
        } catch (_) {
          // stream errors on disconnect are expected
        }
      };
      readLoop();
    };

    const handleParticipantConnected = async (participant: any) => {
      if (greetedParticipants.has(participant.identity)) return;
      greetedParticipants.add(participant.identity);
      logger.info(`👤 Participant connected: ${participant.identity}`);

      if (phoneNumber) {
        logger.info('🔄 Outbound call active - skipping event-based greeting');
        return;
      }
      callAnswered = true;
      lastAudioActivityMs = Date.now();
    };

    const handleParticipantDisconnected = async (participant: any) => {
      logger.info(`👋 Participant disconnected: ${participant.identity}`);
      // During a transfer the SIP participant leaves because it was moved to
      // the human — that must NOT be treated as a caller hangup.
      if (participant.identity.startsWith('sip_') && !callEnded && !transferring) {
        await endCall('caller_hangup');
      }
    };

    ctx.room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    ctx.room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    ctx.room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    // 13. Connect, publish track, dial
    try {
      await connectPromise;
      logger.info('✅ Connected to room');

      if (!ctx.room.localParticipant) {
        logger.error('❌ LocalParticipant is undefined! Cannot publish track.');
      } else {
        try {
          await ctx.room.localParticipant.publishTrack(localTrack as any, { dtx: true, red: true } as any);
          logger.info('📢 Published Agent Audio Track');
        } catch (error) {
          logger.warn('⚠️ Failed with options, retrying without options:', error);
          try {
            await ctx.room.localParticipant.publishTrack(localTrack as any, {} as any);
            logger.info('📢 Published Agent Audio Track (no options)');
          } catch (err2) {
            logger.error('❌ Failed to publish track completely:', err2);
          }
        }
      }
    } catch (err) {
      logger.error('❌ Room connect/publish failed:', err);
      await endCall('connect_failed');
      activeJobs.delete(dedupKey);
      return;
    }

    // 14. SIP Dialing
    if (phoneNumber) {
      const sipTrunkId = process.env.SIP_TRUNK_ID || process.env.VOBIZ_SIP_TRUNK_ID;
      if (sipTrunkId) {
        let userAlreadyHere = false;
        for (const p of ctx.room.remoteParticipants.values()) {
          if (p.identity.startsWith('sip_')) {
            userAlreadyHere = true;
            break;
          }
        }

        if (!userAlreadyHere) {
          logger.info(`📞 Dialling ${phoneNumber} via trunk ${sipTrunkId}...`);

          // ⚡ Pre-generate greeting TTS while the phone rings
          const greetingText = buildGreeting(leadName || undefined);
          const greetingPromise = (async () => {
            try {
              const audio = await tts.generate(normalizeTextForTTS(greetingText));
              return { text: greetingText, audio };
            } catch (err) {
              logger.warn('⚠️ Greeting TTS failed:', err);
              return { text: greetingText, audio: Buffer.alloc(0) };
            }
          })();

          try {
            const sipClient = new SipClient(
              process.env.LIVEKIT_URL!,
              process.env.LIVEKIT_API_KEY!,
              process.env.LIVEKIT_API_SECRET!,
            );
            await sipClient.createSipParticipant(sipTrunkId, phoneNumber, ctx.room.name!, {
              participantIdentity: `sip_${phoneNumber.replace('+', '')}`,
              waitUntilAnswered: true,
            });
            if (callEnded) {
              logger.info('ℹ️ Call already ended while dialing — skipping greeting');
              return;
            }
            logger.info('✅ Call answered! Starting conversation...');
            callAnswered = true;
            lastAudioActivityMs = Date.now();

            // Greeting plays instantly — TTS was generated while ringing
            const greetingResult = await greetingPromise;
            const pcmBuffer = greetingResult.audio;
            if (pcmBuffer && pcmBuffer.length > 0) {
              logger.info(`🗣️  Playing greeting: "${greetingResult.text}"`);
              greetingPlaying = true;
              try {
                await playPcm(pcmBuffer, greetingAbort.signal);
              } finally {
                greetingPlaying = false;
                lastAudioActivityMs = Date.now();
              }

              conversationHistory.push({ role: 'assistant', content: greetingResult.text });
              conversationHistory.push({ role: 'system', content: POST_GREETING_RULES });
              currentStage = 'open_questions';
              pendingFlowQuestion = flowQuestions.open_questions;
              turnLog('SYSTEM', 'STAGE_ADVANCE', { from: 'greeting', to: 'open_questions' });
              await speakFlowQuestion('SYSTEM', greetingAbort.signal);
            } else {
              logger.error('❌ Greeting TTS failed/empty.');
              greetingPlaying = true;
              try {
                await speak('Namaste ji, main Career Guidance Centre se bol rahi hoon. Kya aapko abhi thoda time hai?', greetingAbort.signal);
              } catch (err) {
                logger.error('❌ Fallback greeting speak failed:', err);
              } finally {
                greetingPlaying = false;
                lastAudioActivityMs = Date.now();
              }
              conversationHistory.push({
                role: 'assistant',
                content: 'Namaste ji, main Career Guidance Centre se bol rahi hoon. Kya aapko abhi thoda time hai?',
              });
              conversationHistory.push({ role: 'system', content: POST_GREETING_RULES });
              currentStage = 'open_questions';
              pendingFlowQuestion = flowQuestions.open_questions;
              turnLog('SYSTEM', 'STAGE_ADVANCE', { from: 'greeting', to: 'open_questions' });
              await speakFlowQuestion('SYSTEM', greetingAbort.signal);
            }
          } catch (e: any) {
            const sipStatus = e?.metadata?.sip_status || '';
            const sipCode = parseInt(e?.metadata?.sip_status_code || '0', 10);
            let dialReason = 'dial_failed';
            if (sipCode === 486 || sipStatus === 'Busy Here') dialReason = 'dial_busy';
            else if (sipCode === 487 || sipCode === 603 || sipStatus === 'Decline') dialReason = 'dial_rejected';
            else if (sipCode === 480 || sipStatus === 'Temporarily Unavailable') dialReason = 'dial_unavailable';
            logger.error(`❌ Dial failed (SIP ${sipCode || 'unknown'}):`, e?.message || e);
            await endCall(dialReason);
            await sleep(3000);
          }
        } else {
          logger.info('ℹ️ User already in room. Skipping Dial.');
        }
      } else {
        logger.error('❌ SIP_TRUNK_ID not found in environment!');
      }
    } else {
      logger.info('ℹ️ No phone number provided — waiting for inbound participant.');
    }

    // 15. Wait for shutdown signal
    await new Promise<void>((resolve) => {
      const proc = (ctx as any).proc;
      if (proc && typeof proc.on === 'function') {
        proc.on('shutdown', () => {
          clearInterval(silenceCheckInterval);
          resolve();
        });
      } else {
        ctx.room.once(RoomEvent.Disconnected, () => {
          clearInterval(silenceCheckInterval);
          resolve();
        });
      }
    });

    // Cleanup
    try { stt.close(); } catch {}
    try { await ctx.room.disconnect(); } catch {}
    activeJobs.delete(dedupKey);
  },
});

export default agentDefinition;

// ─────────────────────────────────────────────────────────────────────────────
// Standalone execution — registers as AGENT_NAME (career-counsellor).
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  cli.runApp(
    new WorkerOptions({
      agent: __filename,
      agentName: process.env.AGENT_NAME || 'career-counsellor',
      port: parseInt(process.env.WORKER_PORT || '4043', 10),
      initializeProcessTimeout: 60_000,
      numIdleProcesses: 1,
    }),
  );
}

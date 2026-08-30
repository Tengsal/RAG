# 🎓 Assam Down Town University (AdtU) — AI Admissions & Career Counselling Voice Agent

An enterprise AI voice agent built with **Express, Node.js, MongoDB Atlas, LiveKit, Deepgram, Groq LLM Tool Calling Engine, Sarvam TTS, Gemini 3.6 Flash, and Google OAuth**.

The agent places real outbound telephone calls to prospective students, answers course eligibility & fee structure queries via **MongoDB Tool Calling**, transfers calls live to senior counselors at **`+919678926411`**, and generates structured post-call summaries using **Gemini 3.6 Flash** pushed directly to **MongoDB Atlas** and **Google Sheets**.

---

## 🌟 Key Features

1. **🛠️ LLM Tool Calling Engine**:
   - **`query_course_fees_eligibility({ course_name, degree_level })`**: Real-time MongoDB Atlas DB lookups for fee structures (annual & total tuition), 10+2 / Graduation % eligibility requirements, course duration, and placement partners for any UG or PG program at Assam Down Town University.
   - **`transfer_call({ transfer_number, reason })`**: Live LiveKit SIP call transfer to senior admissions counselor at **`+919678926411`**.

2. **💾 MongoDB Atlas Persistence**:
   - **`AdtuCourse`**: MongoDB collection pre-seeded with 12 real UG & PG programs (B.Tech CSE, BCA, MCA, MBA, B.Pharm, B.Sc Nursing, BBA, BMLT, M.Tech, M.Sc Biotech, M.Pharm).
   - **`AdtuLead`**: Stores student lead profiles, call duration, full transcripts, Gemini 3.6 Flash AI summaries, call transfer tracking, and Google Sheets sync status.

3. **✨ Gemini 3.6 Flash Call Summarizer (`src/services/geminiSummarizer.ts`)**:
   - Multi-key rotation (`GEMINI_API_KEY_1..10` + `GEMINI_API_KEY`) to handle rate limits seamlessly across 10 API keys.
   - Summarizes transcripts post-call with student qualification, inquired courses, fee discussion notes, sentiment tags (`enthusiastic` / `interested`), and counselor next steps.

4. **🔐 Google OAuth Authentication (`src/routes/authRoutes.ts`)**:
   - Google Sign-In verification (`GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`) issuing 7-day JWT tokens for dashboard access.

5. **⚡ Low-Latency Real-Time Audio Pipeline**:
   - **STT**: Deepgram `nova-3` for ultra-accurate speech-to-text.
   - **LLM**: Groq `openai/gpt-oss-20b` (or `llama-3.3-70b-versatile`) with 1000+ tokens/sec throughput.
   - **TTS**: Sarvam `bulbul:v3` with dynamic script-language auto-detection (`en-IN` for Latin script, `hi-IN` for Devanagari script).
   - **Audio Frame Pacing**: High-precision 100ms real-time WebRTC frame pacing eliminating SIP word clipping/distortion.

6. **🌐 Modern Web Dashboard**:
   - Real-time admissions call control console, bulk campaign auto-dialer, AdtU course knowledge base editor, live call monitor, and expandable lead cards featuring **Gemini 3.6 Flash Summaries**.

---

## 🏗️ Architecture Overview

```
Express Server (src/server.ts)          Agent Worker (src/worker.ts)
────────────────────────────            ─────────────────────────────
POST /api/calls {phone, course}         registers as "career-counsellor"
  → creates LiveKit room                receives job with metadata
  → AgentDispatchClient.dispatch(...)   → connects to room
                                        → dials via Vobiz SIP trunk (+918065354410)
                                        → Deepgram STT (nova-3, 48kHz)
                                        → Groq openai/gpt-oss-20b + Tool Engine
                                            • query_course_fees_eligibility → MongoDB Atlas
                                            • transfer_call → LiveKit SIP transfer (+919678926411)
                                        → Sarvam TTS (bulbul:v3, auto script-detect)
                                        → on call end:
                                           1. Gemini 3.6 Flash summarizes transcript
                                           2. Saves to MongoDB Atlas (AdtuLead collection)
                                           3. Pushes to Google Sheets Webhook
                                           4. Notifies server → next lead in bulk queue
```

---

## ⚡ Latency & Audio Quality Optimizations

| Optimization | Technical Detail & Effect |
|---|---|
| **100ms RTP Frame Pacing** | Fixed `AudioSource.captureFrame()` non-blocking loop in LiveKit RTC SDK with high-precision sleep pacing, preventing WebRTC packet drops and speech distortion. |
| **Dynamic Script Language Detection** | `autoDetectScriptLanguage()` automatically routes Latin/English script to `en-IN` and Devanagari script to `hi-IN` on Sarvam TTS `bulbul:v3`, preventing robotic distortion. |
| **Pre-generated Filler Audio** | Plays "haan ji, ek second…" during Groq reasoning delay (~1s), keeping the caller engaged. |
| **STT Immediate Teardown** | `stt.close()` executes immediately on call end to prevent ghost transcriptions after hangup. |
| **User Silence Watchdog** | 5s user silence triggers *"Hello? Kya aap line par hai?"*; 10s silence gracefully ends the call. |

---

## 🚀 Getting Started

### 1. Environment Setup (`.env`)

Ensure the `.env` file contains your credentials (inherited from `server/.env`):

```ini
PORT=5100
WORKER_PORT=4043
AGENT_NAME=career-counsellor

# MongoDB Atlas
MONGODB_URI=mongodb+srv://school-management:school-management@cluster0.tk0qz.mongodb.net/multi_agent_system?retryWrites=true&w=majority&appName=Cluster0

# LiveKit & Vobiz SIP Trunk
LIVEKIT_URL=wss://aiagent-8oewd9yy.livekit.cloud
LIVEKIT_API_KEY=APISbjU8PD3uHMp
LIVEKIT_API_SECRET=TV2U6Tfdbmf25wfuF1LbrBVPkFki8CpWJBEej85IgXlD
SIP_TRUNK_ID=ST_vnZ2fdmdi5bP
DEFAULT_TRANSFER_NUMBER=+919678926411

# AI Pipeline
GROQ_API_KEY=gsk_REDACTED
GROQ_MODEL=openai/gpt-oss-20b
DEEPGRAM_API_KEY=9e87649cd6410fdfd0e543f2d2d2b0714456981e
SARVAM_API_KEY=sk_5ddjuieq_YwOUqwzy8pym97LwZDIwpBsm
STT_MODEL=nova-3

# Gemini 3.6 Flash Multi-Key Rotation
GEMINI_API_KEY_1=AIzaSyCKXk_GmiyEvnR5MqKG8LBjjEsaC4nDssc
...
GEMINI_API_KEY_10=AIzaSyBLH-yhm5D6pQogalS4g7Q6drSgl7lEr14

# Google Auth
GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID_REDACTED
GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET_REDACTED
```

### 2. Install & Start Application

```bash
# Start Server (:5100) and Worker (:4043) in parallel
npm run dev
```

Dashboard will open automatically at **http://localhost:5100**.

### 3. Seed Assam Down Town University Course KB

To seed or refresh AdtU courses in MongoDB Atlas:

```bash
npx tsx src/scripts/seed_courses.ts
```

---

## 📡 REST API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/calls` | `POST` | Dispatch single phone call (`{ phone, lead_name, course, voice, language }`) |
| `/api/calls/bulk` | `POST` | Dispatch sequential bulk campaign with pause between leads |
| `/api/calls/transfer` | `POST` | Manual call transfer to senior counselor (`+919678926411`) |
| `/api/courses` | `GET` | List AdtU programs, tuition fees, and eligibility requirements |
| `/api/adtu-courses` | `POST` | Add/Update AdtU course in MongoDB Atlas |
| `/api/adtu-leads` | `GET` | Retrieve captured leads with Gemini 3.6 Flash summaries from MongoDB Atlas |
| `/api/auth/google/verify` | `POST` | Authenticate Google OAuth ID token and issue JWT session |
| `/health` | `GET` | Server health, MongoDB Atlas status, and active model telemetry |

---

## 📄 Git & Security

- **`.gitignore`** is configured to exclude `node_modules/`, `dist/`, `.env`, `.env.*`, `*.log`, `leads/`, and `calls.jsonl` from git commits.

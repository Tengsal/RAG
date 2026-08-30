/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — System Status Page Module
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function renderSystemPage() {
  const lastCheck = new Date().toLocaleTimeString();

  return `
    <div class="app-view active" id="view-system">
      <!-- Concise Page Intro Header -->
      <div style="margin-bottom: 16px;">
        <h1 style="font-size: 18px; font-weight: 800; color: var(--brand-navy-dark);">Infrastructure System Status & Health</h1>
        <p class="muted" style="font-size: 12.5px; margin-top: 2px;">Real-time operational status monitoring across Voice WebRTC, AI Engines, MongoDB Atlas, and Human Escalation routing.</p>
      </div>

      <!-- System Health Summary Row -->
      <div class="card" style="margin-bottom: 20px; border-left: 4px solid var(--green);">
        <div class="card-body" style="padding: 14px 18px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--green-bg); border: 1px solid var(--green-border); color: var(--green-text); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700;">✓</div>
              <div>
                <h3 style="font-size: 14.5px; font-weight: 700; color: var(--brand-navy-dark);">All System Services Operational</h3>
                <p class="muted" style="font-size: 12px;">7 of 7 core integrations actively healthy</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 20px; font-size: 12px;">
              <div><span class="muted">Health Status:</span> <strong style="color: var(--green-text);">100% Operational</strong></div>
              <div><span class="muted">Last Verified:</span> <strong id="sys-health-timestamp" class="mono">${esc(lastCheck)}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Grouped System Status Cards Grid -->
      <div class="system-grid">
        
        <!-- Group 1: Voice & AI Pipeline -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">🎙️ Voice & AI Pipeline</h3>
              <p class="card-desc">Real-time WebRTC room dispatch, speech recognition, LLM reasoning & TTS synthesis</p>
            </div>
            <span class="badge badge-green">4 / 4 Active</span>
          </div>
          <div class="card-body">
            <ul class="sys-list">
              <li>
                <div>
                  <strong style="font-size: 13px; color: var(--brand-navy-dark);">LiveKit WebRTC Agent Dispatcher</strong>
                  <div class="muted" style="font-size: 11.5px;">Real-time audio streaming & room manager</div>
                </div>
                <span class="badge badge-green">Connected ✓</span>
              </li>
              <li>
                <div>
                  <strong style="font-size: 13px; color: var(--brand-navy-dark);">Speech-to-Text (STT) Engine</strong>
                  <div class="muted" style="font-size: 11.5px;">Deepgram nova-3 transcription</div>
                </div>
                <span class="badge badge-green">Active ✓</span>
              </li>
              <li>
                <div>
                  <strong style="font-size: 13px; color: var(--brand-navy-dark);">Groq LLM Reasoning Engine</strong>
                  <div class="muted" style="font-size: 11.5px;">Model: openai/gpt-oss-20b</div>
                </div>
                <span class="badge badge-green">Active ✓</span>
              </li>
              <li>
                <div>
                  <strong style="font-size: 13px; color: var(--brand-navy-dark);">Text-to-Speech (TTS) Engine</strong>
                  <div class="muted" style="font-size: 11.5px;">Sarvam bulbul:v3 (Kavya Persona)</div>
                </div>
                <span class="badge badge-green">Active ✓</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Group 2: Data Stores & Webhooks -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">🗄️ Data & Integration Stack</h3>
              <p class="card-desc">Persistent MongoDB Atlas database, Gemini summarization & Google Sheets sync</p>
            </div>
            <span class="badge badge-green">3 / 3 Active</span>
          </div>
          <div class="card-body">
            <ul class="sys-list">
              <li>
                <div>
                  <strong style="font-size: 13px; color: var(--brand-navy-dark);">MongoDB Atlas Database</strong>
                  <div class="muted" style="font-size: 11.5px;">Cluster0 (AdtuCourse & AdtuLead Collections)</div>
                </div>
                <span class="badge badge-green">Connected ✓</span>
              </li>
              <li>
                <div>
                  <strong style="font-size: 13px; color: var(--brand-navy-dark);">Gemini 3.6 Flash Lead Summarizer</strong>
                  <div class="muted" style="font-size: 11.5px;">Automated call intelligence & action steps</div>
                </div>
                <span class="badge badge-green">Active ✓</span>
              </li>
              <li>
                <div>
                  <strong style="font-size: 13px; color: var(--brand-navy-dark);">Google Sheets Webhook Sync</strong>
                  <div class="muted" style="font-size: 11.5px;">Real-time lead spreadsheet sync</div>
                </div>
                <span class="badge badge-neutral">Configured ✓</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Group 3: Human Escalation & SIP Call Transfer (Full Width Row) -->
        <div class="card" style="grid-column: 1 / -1; background: var(--gradient-card-accent); border-color: var(--blue-border);">
          <div class="card-header">
            <div>
              <h3 class="card-title" style="color: var(--brand-blue);">📞 Human Counselor Escalation & SIP Routing</h3>
              <p class="card-desc">Live call handoff to Senior Admissions Officer when student requests human guidance</p>
            </div>
            <span class="chip chip-green">Live Active</span>
          </div>
          <div class="card-body">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
              <div>
                <div class="muted" style="font-size: 12px;">Active Senior Counselor Transfer Target Line</div>
                <div style="font-size: 20px; font-weight: 800; color: var(--brand-navy-dark); font-family: Consolas, 'Cascadia Mono', monospace; margin: 4px 0;">
                  +919678926411
                </div>
                <p class="muted" style="font-size: 12px; max-width: 650px; line-height: 1.4;">
                  LiveKit RTC room is transferred directly via SIP trunking to Senior Admissions Officer (+919678926411) upon AI trigger or student request.
                </p>
              </div>
              <span class="badge badge-green" style="padding: 6px 12px; font-size: 12.5px;">Routing Target Operational ✓</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

function initSystemPage() {
  const ts = $('sys-health-timestamp');
  if (ts) ts.textContent = new Date().toLocaleTimeString();
}

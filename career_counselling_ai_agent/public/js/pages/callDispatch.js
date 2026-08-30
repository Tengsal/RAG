/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Call Dispatch Page Module
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function renderDispatchPage() {
  return `
    <div class="app-view active" id="view-dispatch">
      <!-- Concise Page Intro Header -->
      <div style="margin-bottom: 16px;">
        <h1 style="font-size: 18px; font-weight: 800; color: var(--brand-navy-dark);">Outbound Admissions Voice AI Dispatcher</h1>
        <p class="muted" style="font-size: 12.5px; margin-top: 2px;">Configure prospective student details, target academic program, and voice counselor persona to dispatch real-time outbound calls.</p>
      </div>

      <div class="dispatch-workspace-grid">
        
        <!-- LEFT COLUMN (~60%): DISPATCH FORM -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Dispatch Parameters Form</h2>
              <p class="card-desc">Enter phone number, lead info, and counselor configuration</p>
            </div>
            <span class="badge badge-navy">AdtU UG & PG</span>
          </div>

          <div class="card-body" style="padding: 16px 18px;">
            <form id="call-form" autocomplete="off">
              <!-- Grid Row 1: Phone & Lead Name -->
              <div class="dispatch-form-grid">
                <label class="form-field">
                  <span class="label-text">Student Phone Number <b style="color: var(--red);">*</b></span>
                  <input id="phone" type="tel" placeholder="10-digit mobile (e.g. 970707xxxx)" required />
                </label>
                <label class="form-field">
                  <span class="label-text">Lead Name</span>
                  <input id="lead-name" type="text" placeholder="e.g. Rahul Sharma" />
                </label>
              </div>

              <!-- Grid Row 2: Lead ID & Target Course -->
              <div class="dispatch-form-grid">
                <label class="form-field">
                  <span class="label-text">Lead Reference ID</span>
                  <input id="lead-id" type="text" placeholder="e.g. ADTU-2026-001" />
                </label>
                <label class="form-field">
                  <span class="label-text">Target Course Program</span>
                  <select id="course"></select>
                </label>
              </div>

              <!-- Grid Row 3: Language & Pace -->
              <div class="dispatch-form-grid">
                <label class="form-field">
                  <span class="label-text">Language & Accent</span>
                  <select id="language">
                    <option value="hi-IN" selected>Hinglish — Hindi + English (Recommended)</option>
                    <option value="en-IN">English (en-IN)</option>
                    <option value="hi-IN">Hindi (hi-IN)</option>
                    <option value="ta-IN">Tamil (ta-IN)</option>
                    <option value="te-IN">Telugu (te-IN)</option>
                    <option value="kn-IN">Kannada (kn-IN)</option>
                    <option value="ml-IN">Malayalam (ml-IN)</option>
                    <option value="mr-IN">Marathi (mr-IN)</option>
                    <option value="bn-IN">Bengali (bn-IN)</option>
                    <option value="gu-IN">Gujarati (gu-IN)</option>
                  </select>
                </label>
                <label class="form-field">
                  <span class="label-text">Speaking Pace</span>
                  <select id="pace">
                    <option value="1.0" selected>Normal Pace (1.0x)</option>
                    <option value="0.8">Slower (0.8x)</option>
                    <option value="0.6">Slowest (0.6x)</option>
                  </select>
                </label>
              </div>

              <!-- Grid Row 4: Voice Model & TTS Engine -->
              <div class="dispatch-form-grid">
                <label class="form-field">
                  <span class="label-text">Voice Persona</span>
                  <select id="voice">
                    <option value="kavya" selected>Kavya (Female, Hindi/Hinglish)</option>
                    <option value="anushka">Anushka (Female, Hindi)</option>
                    <option value="meera">Meera (Female)</option>
                    <option value="arvind">Arvind (Male)</option>
                    <option value="amol">Amol (Male)</option>
                    <option value="diya">Diya (Female)</option>
                  </select>
                </label>
                <label class="form-field">
                  <span class="label-text">TTS Engine</span>
                  <select id="tts-model">
                    <option value="bulbul:v3" selected>Sarvam bulbul:v3 (Fast Streaming)</option>
                    <option value="bulbul:v2">Sarvam bulbul:v2 (Fallback)</option>
                  </select>
                </label>
              </div>

              <!-- Grid Row 5: LLM Model & STT Engine -->
              <div class="dispatch-form-grid">
                <label class="form-field">
                  <span class="label-text">LLM Engine</span>
                  <select id="llm-model">
                    <option value="openai/gpt-oss-20b" selected>openai/gpt-oss-20b (Groq Default)</option>
                    <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                    <option value="llama3-70b-8192">llama3-70b-8192</option>
                    <option value="gemma2-9b-it">gemma2-9b-it</option>
                  </select>
                </label>
                <label class="form-field">
                  <span class="label-text">STT Engine</span>
                  <select id="stt-model">
                    <option value="nova-3" selected>Deepgram nova-3 (Best Accuracy)</option>
                    <option value="nova-2">Deepgram nova-2</option>
                  </select>
                </label>
              </div>

              <!-- Collapsible Advanced System Prompt Overrides -->
              <details style="margin-bottom: 14px; border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 8px; background: var(--bg-subtle);">
                <summary style="cursor: pointer; font-weight: 600; font-size: 12px; color: var(--brand-navy);">Advanced System Prompt Overrides</summary>
                <label class="form-field" style="margin-top: 8px;">
                  <span class="label-text">Custom AdtU System Prompt (Optional)</span>
                  <textarea id="sys-prompt" rows="3" placeholder="Leave blank to use default Assam Down Town University prompt…"></textarea>
                </label>
              </details>

              <!-- Prominent Full-Width Action Button -->
              <button class="btn btn-primary-gradient" id="call-btn" type="submit" style="width: 100%; height: 42px; font-size: 14px; font-weight: 700;">Dispatch Admissions Call</button>
            </form>
          </div>
        </div>

        <!-- RIGHT COLUMN (~40%): CONTEXTUAL OPERATIONS PANEL -->
        <div class="dispatch-context-panel">
          
          <!-- Card 1: Operational Readiness (Primary Status Card) -->
          <div class="context-card" style="border-top: 3px solid var(--green);">
            <div class="context-card-title">
              <span>⚡ Operational Readiness</span>
              <span class="badge badge-green">Operational ✓</span>
            </div>
            <ul class="context-list">
              <li>
                <span class="muted">LiveKit WebRTC Dispatcher</span>
                <span class="text-green" style="font-weight: 600;">Connected ✓</span>
              </li>
              <li>
                <span class="muted">Active Counselor Persona</span>
                <strong id="dispatch-voice-summary" style="font-size: 12px; color: var(--brand-navy-dark);">Kavya (Female, Hinglish)</strong>
              </li>
            </ul>

            <!-- Compact Collapsible System Details -->
            <details style="margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 6px;">
              <summary style="cursor: pointer; font-size: 11.5px; font-weight: 600; color: var(--text-muted);">System pipeline details</summary>
              <ul class="context-list" style="margin-top: 6px;">
                <li><span class="muted">LLM Engine</span> <strong>openai/gpt-oss-20b</strong></li>
                <li><span class="muted">TTS Engine</span> <strong>bulbul:v3</strong></li>
                <li><span class="muted">STT Engine</span> <strong>nova-3</strong></li>
              </ul>
            </details>
          </div>

          <!-- Card 2: Senior Counselor Transfer Target -->
          <div class="context-card" style="background: var(--gradient-card-accent); border-color: var(--blue-border);">
            <div class="context-card-title" style="color: var(--brand-blue);">
              <span>📞 Senior Counselor Escalation</span>
              <span class="chip chip-green">Active Line Ready</span>
            </div>
            <div style="font-size: 19px; font-weight: 800; color: var(--brand-navy-dark); font-family: Consolas, 'Cascadia Mono', monospace; margin: 4px 0;">
              +919678926411
            </div>
            <p class="muted" style="font-size: 11.5px; line-height: 1.35;">
              Automated SIP call transfer ready if prospect requests escalation or senior officer guidance.
            </p>
          </div>

          <!-- Card 3: Selected Program Reference -->
          <div class="context-card">
            <div class="context-card-title">
              <span>📚 Selected Program Reference</span>
              <span class="badge badge-navy">Knowledge Base</span>
            </div>
            <div id="dispatch-course-info">
              <p class="muted" style="font-size: 12px;">Select a target program from the dispatch form to view tuition fees and eligibility details.</p>
            </div>
          </div>

          <!-- Card 4: Recent Dispatched Sessions -->
          <div class="context-card">
            <div class="context-card-title">
              <span>📡 Recent Dispatched Sessions</span>
              <button class="btn btn-sm btn-secondary" data-goto="calls" style="padding: 2px 8px; font-size: 11px;">View All</button>
            </div>
            <div class="table-container">
              <table class="data-table" style="font-size: 12px;">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Status</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody id="dispatch-recent-calls">
                  <tr class="empty-row"><td colspan="3" style="padding: 12px 10px; font-size: 12px;">No calls dispatched in this session yet</td></tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;
}

function initDispatchPage() {
  // Populate course dropdown options
  const select = $('course');
  if (select && cachedCourses.length > 0) {
    select.innerHTML = [
      '<option value="">General Admissions Counselling — let Kavya guide</option>',
      ...cachedCourses.map((c) => {
        const name = typeof c === 'string' ? c : c.courseName;
        return `<option value="${esc(name)}">${esc(name)}</option>`;
      }),
    ].join('');
  }

  // Update selected course quick reference card
  function updateCourseContext() {
    const infoBox = $('dispatch-course-info');
    if (!infoBox) return;
    const selectedName = select ? select.value : '';
    if (!selectedName) {
      infoBox.innerHTML = `<p class="muted" style="font-size: 12px; line-height: 1.4;">General Admissions Counselling selected — AI agent guides prospect across all Assam Down Town University programs.</p>`;
      return;
    }

    const courseObj = cachedCourses.find((c) => (typeof c === 'string' ? c === selectedName : c.courseName === selectedName));
    if (!courseObj || typeof courseObj === 'string') {
      infoBox.innerHTML = `<p class="muted" style="font-size: 12px;">Program: <b>${esc(selectedName)}</b></p>`;
      return;
    }

    const totalFee = ((courseObj.totalTuitionFee || 0) / 100000).toFixed(2);
    const annualFee = ((courseObj.annualTuitionFee || 0) / 100000).toFixed(2);

    infoBox.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <strong style="font-size: 13px; color: var(--brand-navy-dark);">${esc(courseObj.courseName)}</strong>
        <span class="chip ${courseObj.degreeLevel === 'PG' ? 'chip-amber' : 'chip-green'}">${esc(courseObj.degreeLevel || 'UG')}</span>
      </div>
      <div class="muted" style="margin-bottom: 6px; font-size: 11.5px;">Code: <span class="mono">${esc(courseObj.courseCode || '—')}</span> | Dept: ${esc(courseObj.department || 'AdtU')}</div>
      <div style="background: var(--bg-subtle); padding: 6px 10px; border-radius: 6px; font-size: 12px; margin-bottom: 6px;">
        <div><b>Total Fee:</b> ₹${totalFee}L (₹${annualFee}L / year)</div>
      </div>
      <div style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.35;">
        <b>Eligibility:</b> ${esc(courseObj.eligibilityCriteria || 'Pass 10+2 with required marks')}
      </div>
    `;
  }

  if (select) {
    select.addEventListener('change', updateCourseContext);
    updateCourseContext();
  }

  // Update voice summary trigger
  const voiceSelect = $('voice');
  const voiceSummary = $('dispatch-voice-summary');
  if (voiceSelect && voiceSummary) {
    voiceSelect.addEventListener('change', () => {
      const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
      if (selectedOption) voiceSummary.textContent = selectedOption.text;
    });
  }

  // Render recent calls preview in right column
  const recentTable = $('dispatch-recent-calls');
  if (recentTable && cachedCalls.length > 0) {
    const topCalls = cachedCalls.slice(0, 3);
    recentTable.innerHTML = topCalls
      .map((c) => `<tr>
        <td><b>${esc(c.lead_name || 'Prospect')}</b><div class="muted">${esc(c.phone || '')}</div></td>
        <td>${statusChip(c.status)}</td>
        <td class="mono">${fmtDur(c.duration)}</td>
      </tr>`)
      .join('');
  }

  // Bind call dispatch form submit listener
  const callForm = $('call-form');
  if (callForm) {
    callForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const phoneRaw = $('phone').value.trim().replace(/[^\d+]/g, '');
      if (!/^\+?\d{10,13}$/.test(phoneRaw)) {
        toast('Enter a valid phone number (10–13 digits).', 'err');
        return;
      }
      const display = phoneRaw.startsWith('+') ? phoneRaw : '+91' + phoneRaw;
      if (!confirm(`Dispatch real AI admissions call to ${display} for Assam Down Town University?`)) return;

      const btn = $('call-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Dispatching Call…';
      try {
        const r = await api('/api/calls', {
          method: 'POST',
          body: {
            phone: phoneRaw,
            lead_name: $('lead-name').value.trim() || null,
            lead_id: $('lead-id').value.trim() || null,
            course: $('course').value || null,
            language: $('language').value,
            pace: parseFloat($('pace').value) || 1.0,
            voice: $('voice').value || null,
            tts_model: $('tts-model').value || null,
            llm_model: $('llm-model').value || null,
            stt_model: $('stt-model').value || null,
            system_prompt: $('sys-prompt').value.trim() || null,
          },
        });
        toast(`📞 Call dispatched → ${display} (ID: ${r.call_id.slice(0, 8)})`, 'ok');
        switchView('calls');
      } catch (e) {
        toast(`Dispatch failed: ${e.message}`, 'err', 7000);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Dispatch Admissions Call';
      }
    });
  }
}

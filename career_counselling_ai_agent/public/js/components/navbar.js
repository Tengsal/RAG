/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Navbar & Health Popover Component
   ═══════════════════════════════════════════════════════════════ */

'use strict';

async function loadHealth() {
  const box = $('health-pills');
  if (!box) return;
  try {
    const h = await api('/health');
    const isOk = h.mongo_connected;

    box.innerHTML = `
      <button class="status-trigger-btn ${isOk ? 'status-ok' : 'status-warn'}" id="status-trigger-btn">
        <span class="status-dot"></span>
        <span>System ${isOk ? 'Healthy' : 'Degraded'}</span>
        <span style="font-size: 10px; margin-left: 2px;">▾</span>
      </button>

      <div class="status-popover-card" id="status-popover-card" hidden>
        <div class="popover-head">
          <strong>Integration Health</strong>
          <span class="badge ${isOk ? 'badge-green' : 'badge-amber'}">${isOk ? 'All Systems OK' : 'Degraded'}</span>
        </div>
        <ul class="popover-list">
          <li>
            <span class="pop-label">Database</span>
            <span class="pop-val ${h.mongo_connected ? 'text-green' : 'text-amber'}">${h.mongo_connected ? 'MongoDB Atlas ✓' : 'Connecting'}</span>
          </li>
          <li>
            <span class="pop-label">LLM Engine</span>
            <span class="pop-val">${esc(h.groq_model || 'gpt-oss-20b')}</span>
          </li>
          <li>
            <span class="pop-label">TTS Engine</span>
            <span class="pop-val">${esc(h.tts || 'bulbul:v3')}</span>
          </li>
          <li>
            <span class="pop-label">STT Engine</span>
            <span class="pop-val">${esc(h.stt || 'nova-3')}</span>
          </li>
          <li>
            <span class="pop-label">Senior Counselor Routing</span>
            <span class="pop-val">+919678926411</span>
          </li>
          <li>
            <span class="pop-label">Google Sheets Sync</span>
            <span class="pop-val">${h.sheets_webhook ? 'Configured ✓' : 'Local-only'}</span>
          </li>
        </ul>
      </div>
    `;

    const btn = $('status-trigger-btn');
    const card = $('status-popover-card');
    if (btn && card) {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        card.hidden = !card.hidden;
      });
    }
  } catch (e) {
    box.innerHTML = `
      <button class="status-trigger-btn status-bad">
        <span class="status-dot"></span>
        <span>System Offline</span>
      </button>
    `;
  }
}

// Close popover when clicking outside
document.addEventListener('click', (ev) => {
  const card = $('status-popover-card');
  if (card && !ev.target.closest('#health-pills')) {
    card.hidden = true;
  }
});

// Notifications trigger
const notifBtn = $('notif-btn');
if (notifBtn) {
  notifBtn.addEventListener('click', () => {
    toast('No new urgent notifications. Admissions AI agent operating normally.', 'info');
  });
}

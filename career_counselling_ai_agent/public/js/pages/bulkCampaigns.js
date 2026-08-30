/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Bulk Campaigns Page Module
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function renderCampaignsPage() {
  return `
    <div class="app-view active" id="view-campaigns">
      <!-- Concise Page Intro Header -->
      <div style="margin-bottom: 16px;">
        <h1 style="font-size: 18px; font-weight: 800; color: var(--brand-navy-dark);">Bulk Admissions Campaign Operations</h1>
        <p class="muted" style="font-size: 12.5px; margin-top: 2px;">Sequential auto-dialer for automated batch student outreach and high-volume admissions campaigns.</p>
      </div>

      <div class="campaign-workspace-grid">
        
        <!-- LEFT COLUMN (~60%): CAMPAIGN FORM -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Bulk Campaign Setup</h2>
              <p class="card-desc">Import contacts and configure auto-dialer batch parameters</p>
            </div>
            <span class="badge badge-blue">Auto-Dialer</span>
          </div>

          <div class="card-body" style="padding: 16px 18px;">
            <!-- Workflow Step 1: Import Contacts -->
            <div style="margin-bottom: 16px;">
              <label class="form-field">
                <span class="label-text" style="font-weight: 700; color: var(--brand-navy-dark);">1. Import Student Contacts</span>
                <textarea id="bulk-text" rows="4" placeholder="9707070957, Rahul Sharma, B.Tech CSE&#10;9812345678, Priya Das, MBA"></textarea>
              </label>
              <p class="muted" style="font-size: 11.5px; margin-top: 6px;">
                Enter student contacts as <code>phone, name, course</code> (one per line) or paste a JSON array of lead objects.
              </p>
            </div>

            <!-- Workflow Step 2: Configure Dialing Parameters -->
            <div style="margin-bottom: 18px; border-top: 1px dashed var(--border-color); padding-top: 14px;">
              <div class="form-row" style="align-items: flex-end; margin-bottom: 0;">
                <label class="form-field grow">
                  <span class="label-text" style="font-weight: 700; color: var(--brand-navy-dark);">2. Pause Between Calls (ms)</span>
                  <input id="bulk-delay" type="number" value="15000" min="2000" step="1000" />
                </label>
              </div>
              <p class="muted" style="font-size: 11.5px; margin-top: 4px;">
                Sequential pause interval (default: 15,000ms / 15 seconds) to manage counselor bandwidth and agent room initialization.
              </p>
            </div>

            <!-- Dominant Full-Width Primary Action Button -->
            <button class="btn btn-primary-gradient" id="bulk-btn" type="button" style="width: 100%; height: 42px; font-size: 14px; font-weight: 700;">
              Start Admissions Campaign
            </button>

            <!-- Dynamic Execution Progress Message Banner -->
            <div class="progress-message" id="bulk-progress" hidden style="margin-top: 14px; padding: 10px 14px; background: var(--brand-light); border: 1px solid var(--blue-border); border-radius: 8px; color: var(--brand-navy-dark); font-size: 12.5px; font-weight: 600;"></div>
          </div>
        </div>

        <!-- RIGHT COLUMN (~40%): CAMPAIGN PREVIEW & READINESS PANEL -->
        <div class="campaign-context-panel">
          
          <!-- Card 1: Campaign Readiness & Status -->
          <div class="context-card" style="border-top: 3px solid var(--brand-blue);">
            <div class="context-card-title">
              <span>⚡ Campaign Readiness</span>
              <span id="campaign-ready-badge" class="badge badge-amber">Awaiting Contacts</span>
            </div>
            <ul class="context-list">
              <li>
                <span class="muted">Parsed Lead Count</span>
                <strong id="campaign-parsed-count" style="color: var(--brand-navy-dark);">0 Leads Parsed</strong>
              </li>
              <li>
                <span class="muted">Configured Dial Interval</span>
                <strong id="campaign-interval-display">15.0s between calls</strong>
              </li>
              <li>
                <span class="muted">Auto-Dialer Strategy</span>
                <span>Sequential Batch Dispatch</span>
              </li>
              <li>
                <span class="muted">Active Voice Counselor</span>
                <strong>Kavya (Hinglish)</strong>
              </li>
            </ul>
          </div>

          <!-- Card 2: Live Execution Monitor -->
          <div class="context-card">
            <div class="context-card-title">
              <span>📡 Execution Monitor</span>
              <button class="btn btn-sm btn-secondary" data-goto="calls" style="padding: 2px 8px; font-size: 11px;">View Live Calls →</button>
            </div>
            <div id="campaign-execution-box" style="font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
              <p class="muted">No bulk campaign currently active. Add student lead contacts on the left to initialize outreach.</p>
            </div>
          </div>

          <!-- Card 3: Senior Counselor Escalation Line -->
          <div class="context-card" style="background: var(--gradient-card-accent); border-color: var(--blue-border);">
            <div class="context-card-title" style="color: var(--brand-blue);">
              <span>📞 Senior Counselor Routing</span>
              <span class="chip chip-green">Active Line Ready</span>
            </div>
            <div style="font-size: 19px; font-weight: 800; color: var(--brand-navy-dark); font-family: Consolas, 'Cascadia Mono', monospace; margin: 4px 0;">
              +919678926411
            </div>
            <p class="muted" style="font-size: 11.5px; line-height: 1.35;">
              Automated SIP call transfer ready during bulk outreach if prospect requests human counselor guidance.
            </p>
          </div>

        </div>

      </div>
    </div>
  `;
}

function initCampaignsPage() {
  const bulkText = $('bulk-text');
  const bulkDelay = $('bulk-delay');
  const bulkBtn = $('bulk-btn');
  const parsedCountEl = $('campaign-parsed-count');
  const readyBadgeEl = $('campaign-ready-badge');
  const intervalDisplayEl = $('campaign-interval-display');
  const execBoxEl = $('campaign-execution-box');

  function updateCampaignPreview() {
    const text = bulkText ? bulkText.value : '';
    const delayMs = Math.max(2000, parseInt(bulkDelay?.value, 10) || 15000);

    let contacts = [];
    try {
      contacts = parseBulk(text);
    } catch (_) {}

    if (parsedCountEl) {
      parsedCountEl.textContent = `${contacts.length} ${contacts.length === 1 ? 'Lead' : 'Leads'} Parsed`;
    }

    if (intervalDisplayEl) {
      intervalDisplayEl.textContent = `${(delayMs / 1000).toFixed(1)}s between calls`;
    }

    if (readyBadgeEl) {
      if (contacts.length > 0) {
        readyBadgeEl.className = 'badge badge-green';
        readyBadgeEl.textContent = 'Ready to Dispatch ✓';
      } else {
        readyBadgeEl.className = 'badge badge-amber';
        readyBadgeEl.textContent = 'Awaiting Contacts';
      }
    }
  }

  if (bulkText) bulkText.addEventListener('input', updateCampaignPreview);
  if (bulkDelay) bulkDelay.addEventListener('input', updateCampaignPreview);

  updateCampaignPreview();

  if (bulkBtn) {
    bulkBtn.addEventListener('click', async () => {
      let contacts;
      try {
        contacts = parseBulk($('bulk-text').value);
      } catch (e) {
        toast(`Bulk list parse error: ${e.message}`, 'err', 7000);
        return;
      }
      if (!contacts.length) {
        toast('Paste at least one lead (phone required).', 'err');
        return;
      }
      if (!confirm(`Start AdtU Admissions Campaign? ${contacts.length} REAL calls queued.`)) return;

      const btn = $('bulk-btn');
      const prog = $('bulk-progress');
      btn.disabled = true;
      btn.textContent = '⏳ Starting Campaign…';
      try {
        const delay = Math.max(2000, parseInt($('bulk-delay').value, 10) || 15000);
        const r = await api('/api/calls/bulk', {
          method: 'POST',
          body: { contacts, delay_between_ms: delay },
        });
        toast(`🚀 Campaign started — ${r.queued} calls queued, ~${Math.round(delay / 1000)}s apart`, 'ok', 7000);
        if (prog) {
          prog.hidden = false;
          prog.textContent = `Campaign running — ${r.queued} call(s) queued. Watch Live Calls module.`;
        }
        if (execBoxEl) {
          execBoxEl.innerHTML = `
            <div style="background: var(--brand-light); border: 1px solid var(--blue-border); padding: 10px 12px; border-radius: 8px;">
              <strong style="color: var(--brand-navy-dark);">Active Campaign Queued</strong>
              <div class="muted" style="margin-top: 4px;">${r.queued} calls queued (${(delay / 1000).toFixed(1)}s interval).</div>
            </div>
          `;
        }
        switchView('calls');
      } catch (e) {
        toast(`Campaign failed to start: ${e.message}`, 'err', 7000);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Start Admissions Campaign';
      }
    });
  }
}

function parseBulk(raw) {
  const text = raw.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('JSON must be an array');
    return arr
      .filter((c) => c && c.phone)
      .map((c) => ({ ...c, phone: String(c.phone) }));
  }
  const contacts = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [phone, lead_name, course, lead_id] = t.split(',').map((x) => x.trim());
    if (!phone) continue;
    contacts.push({ phone, lead_name, course, lead_id });
  }
  return contacts;
}

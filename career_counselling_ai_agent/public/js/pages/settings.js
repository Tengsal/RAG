/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Settings & Roles Page Module
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function renderSettingsPage() {
  return `
    <div class="app-view active" id="view-settings">
      <!-- Concise Page Intro Header -->
      <div style="margin-bottom: 16px;">
        <h1 style="font-size: 18px; font-weight: 800; color: var(--brand-navy-dark);">Portal Settings & User Access Controls</h1>
        <p class="muted" style="font-size: 12.5px; margin-top: 2px;">Manage Assam Down Town University identity, AI voice counselor defaults, SIP call transfer routing, and admissions team roles.</p>
      </div>

      <form id="settings-form">
        <div class="dispatch-workspace-grid">
          
          <!-- LEFT COLUMN (~60%): GENERAL, VOICE & CALL ROUTING CONFIGURATION -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            
            <!-- Section 1: General Portal Settings -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">🏛️ General Portal Settings</h3>
                  <p class="card-desc">University identity and system environment configuration</p>
                </div>
                <span class="badge badge-navy">AdtU Instance</span>
              </div>
              <div class="card-body" style="padding: 16px 18px;">
                <div class="dispatch-form-grid">
                  <label class="form-field">
                    <span class="label-text">University Identity Name</span>
                    <input type="text" value="Assam Down Town University (AdtU)" readonly style="background: var(--bg-subtle); color: var(--text-secondary);" />
                  </label>
                  <label class="form-field">
                    <span class="label-text">Portal Operations Host</span>
                    <input type="text" value="Admissions Portal (:5100)" readonly style="background: var(--bg-subtle); color: var(--text-secondary);" />
                  </label>
                </div>
              </div>
            </div>

            <!-- Section 2: Voice & AI Counselor Defaults -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">🎙️ Voice & AI Counselor Defaults</h3>
                  <p class="card-desc">Default AI counselor persona, language accent, and speaking pace</p>
                </div>
                <span class="badge badge-blue">AI Defaults</span>
              </div>
              <div class="card-body" style="padding: 16px 18px;">
                <div class="dispatch-form-grid">
                  <label class="form-field">
                    <span class="label-text">Default Voice Counselor</span>
                    <select id="setting-voice">
                      <option value="kavya" selected>Kavya (Female, Hindi/Hinglish)</option>
                      <option value="anushka">Anushka (Female, Hindi)</option>
                      <option value="meera">Meera (Female)</option>
                      <option value="arvind">Arvind (Male)</option>
                    </select>
                  </label>
                  <label class="form-field">
                    <span class="label-text">Default Speaking Pace</span>
                    <select id="setting-pace">
                      <option value="1.0" selected>Normal Pace (1.0x)</option>
                      <option value="0.8">Slower (0.8x)</option>
                      <option value="0.6">Slowest (0.6x)</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <!-- Section 3: Senior Counselor Call Routing -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">📞 Senior Counselor Handoff Routing</h3>
                  <p class="card-desc">Target human counselor line for live WebRTC SIP call transfers</p>
                </div>
                <span class="badge badge-green">SIP Trunk Active</span>
              </div>
              <div class="card-body" style="padding: 16px 18px;">
                <div class="dispatch-form-grid">
                  <label class="form-field">
                    <span class="label-text">Senior Counselor Transfer Target</span>
                    <input id="setting-transfer" type="text" value="+919678926411" required />
                  </label>
                  <label class="form-field">
                    <span class="label-text">Transfer Protocol</span>
                    <input type="text" value="SIP Handoff Protocol (Active)" readonly style="background: var(--bg-subtle); color: var(--text-secondary);" />
                  </label>
                </div>
              </div>
            </div>

            <!-- Action Bar -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--bg-card); border: 1px solid var(--border-color); padding: 14px 18px; border-radius: 12px;">
              <div style="font-size: 12px; color: var(--text-secondary);" id="setting-status-hint">All portal settings up to date.</div>
              <button class="btn btn-primary-gradient" id="setting-submit-btn" type="submit" style="padding: 10px 24px; font-size: 13.5px; font-weight: 700;">Save Portal Settings</button>
            </div>

          </div>

          <!-- RIGHT COLUMN (~40%): ADMISSIONS TEAM ROLES & ACCESS CONTROL -->
          <div class="dispatch-context-panel">
            
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">👥 Admissions Team Roles</h3>
                  <p class="card-desc">Authorized portal roles and system access controls</p>
                </div>
                <span class="badge badge-navy">Access Control</span>
              </div>
              <div class="card-body p-0">
                <div class="table-container">
                  <table class="data-table" style="font-size: 12px;">
                    <thead>
                      <tr>
                        <th>User / Agent</th>
                        <th>Role</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><b>Senior Admissions Lead</b><div class="muted">+919678926411</div></td>
                        <td><span class="chip chip-blue">Admin / Escalation Lead</span></td>
                        <td><span class="badge badge-green">Active</span></td>
                      </tr>
                      <tr>
                        <td><b>AI Voice Agent (Kavya)</b><div class="muted">LiveKit Pipeline</div></td>
                        <td><span class="chip chip-green">Automated Operations</span></td>
                        <td><span class="badge badge-green">Active</span></td>
                      </tr>
                      <tr>
                        <td><b>Admissions Counselor</b><div class="muted">Google Auth User</div></td>
                        <td><span class="chip chip-gray">Portal Counselor</span></td>
                        <td><span class="badge badge-green">Active</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="context-card">
              <div class="context-card-title">
                <span>🛡️ Security & Access Policy</span>
              </div>
              <p class="muted" style="font-size: 11.5px; line-height: 1.4;">
                Assam Down Town University Admissions Operations Portal utilizes OAuth 2.0 Google Identity authentication and encrypted WebRTC room tokens.
              </p>
            </div>

          </div>

        </div>
      </form>
    </div>
  `;
}

function initSettingsPage() {
  const form = $('settings-form');
  const btn = $('setting-submit-btn');
  const hint = $('setting-status-hint');

  if (form) {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Saving Settings…';
      }
      if (hint) hint.textContent = 'Saving portal configuration…';

      setTimeout(() => {
        toast('Assam Down Town University portal settings saved ✓', 'ok');
        if (hint) hint.textContent = 'Saved just now ✓';
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Save Portal Settings';
        }
      }, 500);
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Executive Dashboard Page Module
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function renderDashboardPage() {
  return `
    <div class="app-view active" id="view-dashboard">
      <div class="dash-welcome-banner">
        <div>
          <h2 class="dash-welcome-title">Assam Down Town University Admissions Operations</h2>
          <p class="dash-welcome-subtitle">Real-time AI voice counseling, prospective student engagement, and MongoDB Atlas lead analytics</p>
        </div>
        <button class="btn btn-secondary" id="dash-dispatch-cta" style="margin-top: 14px;">📞 Initiate Admissions Call</button>
      </div>

      <!-- KPI Stat Cards Row -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card-head">
            <span>Total Calls Dispatched</span>
            <span>📞</span>
          </div>
          <div class="kpi-value" id="kpi-total-calls">0</div>
          <div class="muted">Logged calls</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-head">
            <span>Active Live Calls</span>
            <span>📡</span>
          </div>
          <div class="kpi-value" id="kpi-active-calls">0</div>
          <div class="muted">Auto-dialer status</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-head">
            <span>Captured Leads</span>
            <span>👥</span>
          </div>
          <div class="kpi-value" id="kpi-captured-leads">0</div>
          <div class="muted">Atlas & Sheets Synced</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-head">
            <span>Senior Counselor Transfers</span>
            <span>☎️</span>
          </div>
          <div class="kpi-value" id="kpi-transfers">0</div>
          <div class="muted">Target: <b>+919678926411</b></div>
        </div>
      </div>

      <!-- Operations Grid -->
      <div class="analytics-grid">
        <!-- Recent Calls Activity -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Recent Live Calls Activity</h3>
              <p class="card-desc">Latest outgoing counseling sessions</p>
            </div>
            <button class="btn btn-sm btn-secondary" data-goto="calls">View All Calls →</button>
          </div>
          <div class="card-body p-0">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Student Lead</th>
                    <th>Phone</th>
                    <th>Course</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody id="dash-calls-preview"></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Recent Captured Leads -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Latest Captured Leads</h3>
              <p class="card-desc">High intent prospects with Gemini AI analysis</p>
            </div>
            <button class="btn btn-sm btn-secondary" data-goto="leads">View CRM Workspace →</button>
          </div>
          <div class="card-body p-0">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Interested Course</th>
                    <th>Sentiment</th>
                  </tr>
                </thead>
                <tbody id="dash-leads-preview"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initDashboardPage() {
  const dashDispatchCta = $('dash-dispatch-cta');
  if (dashDispatchCta) dashDispatchCta.addEventListener('click', () => switchView('dispatch'));
  updateKPIs();
  renderDashboardPreviews();
}

function renderDashboardPreviews() {
  const callsPrev = $('dash-calls-preview');
  if (callsPrev) {
    const recent = cachedCalls.slice(0, 5);
    if (!recent.length) {
      callsPrev.innerHTML = `<tr class="empty-row"><td colspan="5">No calls dispatched yet</td></tr>`;
    } else {
      callsPrev.innerHTML = recent
        .map((c) => `<tr>
          <td>${statusChip(c.status)}</td>
          <td><b>${esc(c.lead_name || 'Prospect')}</b></td>
          <td class="mono">${esc(c.phone || '')}</td>
          <td class="trunc">${esc(c.course || 'General')}</td>
          <td class="mono">${fmtDur(c.duration)}</td>
        </tr>`)
        .join('');
    }
  }

  const leadsPrev = $('dash-leads-preview');
  if (leadsPrev) {
    const recentLeads = cachedLeads.slice(0, 5);
    if (!recentLeads.length) {
      leadsPrev.innerHTML = `<tr class="empty-row"><td colspan="3">No captured leads yet</td></tr>`;
    } else {
      leadsPrev.innerHTML = recentLeads
        .map((l) => {
          const name = esc(l.leadName || l.lead_name || 'Student Prospect');
          const course = esc(l.interestedCourse || l.interested_course || 'AdtU Program');
          const sentiment = l.geminiSummary?.sentiment || 'interested';
          return `<tr>
            <td><b>${name}</b><div class="muted">${esc(l.phone || '')}</div></td>
            <td><span class="chip chip-blue">${course}</span></td>
            <td><span class="chip ${sentiment === 'enthusiastic' ? 'chip-green' : 'chip-amber'}">✨ ${esc(sentiment)}</span></td>
          </tr>`;
        })
        .join('');
    }
  }
}

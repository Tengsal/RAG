/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Live Admissions Calls Page Module
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function renderCallsPage() {
  return `
    <div class="app-view active" id="view-calls">
      <div class="card">
        <div class="card-header">
          <div class="crm-toolbar-left">
            <div>
              <h2 class="card-title">Live Admissions Voice Calls</h2>
              <p class="card-desc">Real-time status of outgoing AI counseling calls across LiveKit rooms</p>
            </div>
          </div>
          <span class="badge badge-neutral">Auto-refresh 3s</span>
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
                  <th>Time</th>
                  <th>Notes / Errors</th>
                </tr>
              </thead>
              <tbody id="calls-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initCallsPage() {
  loadCalls();
}

function statusChip(status) {
  const s = String(status || 'unknown').toLowerCase();
  if (FINAL_STATUSES.has(s)) {
    if (s === 'completed') return `<span class="chip chip-green">✓ ${esc(s)}</span>`;
    if (s === 'transferred') return `<span class="chip chip-green">📞 transferred (+919678926411)</span>`;
    if (s === 'no-answer') return `<span class="chip chip-gray">${esc(s)}</span>`;
    return `<span class="chip chip-red">${esc(s)}</span>`;
  }
  return `<span class="chip chip-amber chip-pulse">● ${esc(s || 'dispatching')}</span>`;
}

async function loadCalls() {
  try {
    const r = await api('/api/calls');
    cachedCalls = r.calls || [];
    const tbody = $('calls-body');
    if (tbody) {
      if (!cachedCalls.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No calls yet — dispatch your first AdtU lead ⬅</td></tr>`;
      } else {
        tbody.innerHTML = cachedCalls
          .map((c) => {
            const err = c.error ? `<span class="muted" title="${esc(c.error)}">⚠ ${esc(String(c.error).slice(0, 40))}</span>` : '';
            return `<tr>
              <td class="nowrap">${statusChip(c.status)}</td>
              <td>${esc(c.lead_name || '—')}<div class="muted">${esc(c.lead_id || '')}</div></td>
              <td class="mono nowrap">${esc(c.phone || '')}</td>
              <td class="trunc">${esc(c.course || 'AdtU General')}</td>
              <td class="mono nowrap">${fmtDur(c.duration)}</td>
              <td class="mono muted nowrap">${timeAgo(c.created_at)}</td>
              <td>${err || (c.status === 'completed' ? '<span class="muted">—</span>' : '')}</td>
            </tr>`;
          })
          .join('');
      }
    }
    updateKPIs();
    renderDashboardPreviews();
  } catch (e) {
    if ($('calls-body')) $('calls-body').innerHTML = `<tr class="empty-row"><td colspan="7">Could not load calls: ${esc(e.message)}</td></tr>`;
  }
}

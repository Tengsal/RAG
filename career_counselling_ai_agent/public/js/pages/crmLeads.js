/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Leads & CRM Workspace Page Module
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function renderLeadsPage() {
  return `
    <div class="app-view active" id="view-leads">
      <div class="card">
        <div class="crm-toolbar">
          <div class="crm-toolbar-left">
            <div>
              <h2 class="card-title">Admissions Leads & CRM Workspace</h2>
              <p class="card-desc">Prospective students captured during AI calls, synced to MongoDB Atlas & Google Sheets</p>
            </div>
            <span class="badge badge-navy" id="crm-lead-count">0 Leads</span>
          </div>

          <div class="crm-toolbar-right">
            <!-- Search Input -->
            <div class="search-box">
              <input type="text" id="lead-search" placeholder="Search student, phone, course…" />
            </div>

            <!-- Sentiment Filter -->
            <select id="lead-sentiment-filter" class="crm-filter-select">
              <option value="all" selected>All Sentiments</option>
              <option value="enthusiastic">Enthusiastic / High Intent</option>
              <option value="interested">Interested</option>
              <option value="callback">Callback Requested</option>
            </select>

            <!-- Refresh / Sync Button -->
            <button class="btn btn-sm btn-secondary" id="sync-leads-btn" title="Refresh Leads from MongoDB Atlas">🔄 Refresh</button>
          </div>
        </div>

        <div class="card-body p-0">
          <div class="table-container">
            <table class="data-table crm-table">
              <thead>
                <tr>
                  <th style="width: 170px;">Student Name</th>
                  <th style="width: 130px;">Phone Number</th>
                  <th style="width: 120px;">Qualification</th>
                  <th style="width: 150px;">Interested Program</th>
                  <th style="width: 120px;">Callback Time</th>
                  <th style="min-width: 260px;">Gemini 3.6 Flash AI Summary</th>
                  <th style="width: 120px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody id="leads-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initLeadsPage() {
  const leadSearchInput = $('lead-search');
  if (leadSearchInput) leadSearchInput.addEventListener('input', applyLeadFilters);

  const sentimentFilterSelect = $('lead-sentiment-filter');
  if (sentimentFilterSelect) sentimentFilterSelect.addEventListener('change', applyLeadFilters);

  const syncLeadsBtn = $('sync-leads-btn');
  if (syncLeadsBtn) {
    syncLeadsBtn.addEventListener('click', async () => {
      syncLeadsBtn.disabled = true;
      syncLeadsBtn.textContent = '⏳ Syncing…';
      await loadLeads();
      toast('CRM leads refreshed from MongoDB Atlas ✓', 'ok');
      syncLeadsBtn.disabled = false;
      syncLeadsBtn.textContent = '🔄 Refresh';
    });
  }

  applyLeadFilters();
}

async function loadLeads() {
  try {
    let leads = [];
    try {
      const dbRes = await api('/api/adtu-leads');
      if (dbRes.success && Array.isArray(dbRes.leads)) leads = dbRes.leads;
    } catch (_) {
      const fileRes = await api('/api/leads');
      if (fileRes.success && Array.isArray(fileRes.leads)) leads = fileRes.leads;
    }
    cachedLeads = leads;
    applyLeadFilters();
    updateKPIs();
    renderDashboardPreviews();
    renderAISummariesFeed(cachedLeads);
  } catch (e) {
    if ($('leads-body')) $('leads-body').innerHTML = `<tr class="empty-row"><td colspan="7">Could not load leads: ${esc(e.message)}</td></tr>`;
  }
}

function applyLeadFilters() {
  const query = ($('lead-search')?.value || '').toLowerCase().trim();
  const sentimentFilter = $('lead-sentiment-filter')?.value || 'all';

  const filtered = cachedLeads.filter((l) => {
    const name = String(l.leadName || l.lead_name || '').toLowerCase();
    const phone = String(l.phone || '').toLowerCase();
    const course = String(l.interestedCourse || l.interested_course || '').toLowerCase();
    const sentiment = (l.geminiSummary?.sentiment || 'interested').toLowerCase();
    const hasCallback = Boolean(l.callbackTime || l.callback_time);

    const matchesQuery = !query || name.includes(query) || phone.includes(query) || course.includes(query);

    let matchesSentiment = true;
    if (sentimentFilter === 'enthusiastic') matchesSentiment = sentiment === 'enthusiastic';
    else if (sentimentFilter === 'interested') matchesSentiment = sentiment === 'interested';
    else if (sentimentFilter === 'callback') matchesSentiment = hasCallback;

    return matchesQuery && matchesSentiment;
  });

  renderLeadsTable(filtered);
}

function renderLeadsTable(list) {
  const tbody = $('leads-body');
  if (!tbody) return;

  const countBadge = $('crm-lead-count');
  if (countBadge) countBadge.textContent = `${list.length} ${list.length === 1 ? 'Lead' : 'Leads'}`;

  leadDataMap.clear();
  if (!list.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No matching leads found in CRM workspace</td></tr>`;
    return;
  }
  tbody.innerHTML = list
    .map((l) => {
      const id = `t${++leadSeq}`;
      leadDataMap.set(id, l);
      const name = esc(l.leadName || l.lead_name || l.lead_id || 'Prospect Student');
      const gSummary = l.geminiSummary?.summaryText || l.notes || 'No AI summary captured.';
      const sentiment = l.geminiSummary?.sentiment || 'interested';

      return `<tr>
        <td><b>${name}</b><div class="muted">${esc(l.email || '')}</div></td>
        <td class="mono nowrap">${esc(l.phone || '')}</td>
        <td>${esc(l.qualification || l.geminiSummary?.keyQualification || '—')}</td>
        <td><span class="chip chip-blue">${esc(l.interestedCourse || l.interested_course || 'AdtU Program')}</span></td>
        <td class="nowrap">${esc(l.callbackTime || l.callback_time || '—')}</td>
        <td>
          <div class="summary-preview-cell">
            <div><span class="chip ${sentiment === 'enthusiastic' ? 'chip-green' : 'chip-amber'}">✨ ${esc(sentiment)}</span></div>
            <p class="summary-preview-text" title="${esc(gSummary)}">${esc(gSummary)}</p>
          </div>
        </td>
        <td class="nowrap" style="text-align: right;">
          <button class="btn-view-summary" data-t="${id}">👁️ View Summary</button>
        </td>
      </tr>`;
    })
    .join('');
}

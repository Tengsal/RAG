/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — AI Summaries Feed Page Module
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function renderSummariesPage() {
  return `
    <div class="app-view active" id="view-summaries">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Gemini 3.6 Flash Admissions AI Summaries</h2>
            <p class="card-desc">Detailed intelligence extracted automatically after each completed admissions call</p>
          </div>
          <span class="badge badge-green">Gemini 3.6 Flash</span>
        </div>
        <div class="card-body">
          <div id="summaries-container" class="summaries-feed">
            <p class="text-center muted">Loading AI summaries workspace…</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initSummariesPage() {
  renderAISummariesFeed(cachedLeads);
}

function renderAISummariesFeed(leads) {
  const container = $('summaries-container');
  if (!container) return;
  if (!leads.length) {
    container.innerHTML = `<p class="muted text-center" style="padding: 20px 0;">No AI summaries generated yet. Complete calls to see Gemini 3.6 Flash insights.</p>`;
    return;
  }
  container.innerHTML = leads
    .map((l) => {
      const name = esc(l.leadName || l.lead_name || 'Prospect Student');
      const g = l.geminiSummary || {};
      const sentiment = g.sentiment || 'interested';
      return `<div class="summary-card" style="margin-bottom:16px;">
        <div class="summary-header">
          <h3>✨ ${name} — Admissions Intent Summary</h3>
          <span class="chip ${sentiment === 'enthusiastic' ? 'chip-green' : 'chip-amber'}">Sentiment: ${esc(sentiment)}</span>
        </div>
        <p class="summary-text">${esc(g.summaryText || l.notes || 'AI summary generated for this lead.')}</p>
        <div class="summary-grid">
          <div><b>Phone:</b> ${esc(l.phone || '')}</div>
          <div><b>Key Qualification:</b> ${esc(g.keyQualification || l.qualification || '—')}</div>
          <div><b>Interested Course:</b> ${esc(l.interestedCourse || l.interested_course || 'AdtU Program')}</div>
          <div><b>Callback Preference:</b> ${esc(g.callbackPreference || l.callbackTime || 'None')}</div>
        </div>
        ${Array.isArray(g.actionItems) && g.actionItems.length > 0 ? `<div class="action-items"><b>Counselor Action Items:</b> <ul>${g.actionItems.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''}
      </div>`;
    })
    .join('');
}

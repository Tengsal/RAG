/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Reports & Analytics Page Module
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function renderAnalyticsPage() {
  return `
    <div class="app-view active" id="view-analytics">
      <div class="analytics-grid">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Call Outcomes Breakdown</h3>
          </div>
          <div class="card-body text-center">
            <div class="stat-big" id="analytics-completion-rate">0%</div>
            <p class="muted">Call Completion Rate</p>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Lead Qualification & Sentiment</h3>
          </div>
          <div class="card-body">
            <ul class="sentiment-list" id="analytics-sentiment-list">
              <li><span>Enthusiastic / High Intent</span> <b id="cnt-enthusiastic">0</b></li>
              <li><span>Interested</span> <b id="cnt-interested">0</b></li>
              <li><span>Callback Requested</span> <b id="cnt-callback">0</b></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initAnalyticsPage() {
  updateKPIs();
}

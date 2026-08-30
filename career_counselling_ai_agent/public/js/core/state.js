/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Global Application State
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const FINAL_STATUSES = new Set([
  'completed', 'failed', 'no-answer', 'busy', 'rejected', 'cancelled', 'error', 'transferred',
]);

let cachedCalls = [];
let cachedLeads = [];
let cachedCourses = [];
const leadDataMap = new Map();
let leadSeq = 0;

function updateKPIs() {
  const kpiCalls = $('kpi-total-calls');
  const kpiActive = $('kpi-active-calls');
  const kpiLeads = $('kpi-captured-leads');
  const kpiTransfers = $('kpi-transfers');

  const totalCalls = cachedCalls.length;
  const activeCalls = cachedCalls.filter((c) => !FINAL_STATUSES.has(String(c.status).toLowerCase())).length;
  const totalLeads = cachedLeads.length;
  const transfers = cachedCalls.filter((c) => String(c.status).toLowerCase() === 'transferred').length;

  if (kpiCalls) kpiCalls.textContent = totalCalls;
  if (kpiActive) kpiActive.textContent = activeCalls;
  if (kpiLeads) kpiLeads.textContent = totalLeads;
  if (kpiTransfers) kpiTransfers.textContent = transfers;

  // Update navbar badge count
  const navBadge = $('nav-live-count');
  if (navBadge) {
    if (activeCalls > 0) {
      navBadge.textContent = `${activeCalls} Active`;
      navBadge.hidden = false;
    } else {
      navBadge.textContent = 'Live';
    }
  }

  // Analytics view calculations
  const totalCallsCount = cachedCalls.length || 1;
  const completedCallsCount = cachedCalls.filter((c) => String(c.status).toLowerCase() === 'completed' || String(c.status).toLowerCase() === 'transferred').length;
  const rate = Math.round((completedCallsCount / totalCallsCount) * 100);
  const rateEl = $('analytics-completion-rate');
  if (rateEl) rateEl.textContent = `${rate}%`;

  const enth = cachedLeads.filter(l => l.geminiSummary?.sentiment === 'enthusiastic').length;
  const int = cachedLeads.filter(l => (l.geminiSummary?.sentiment || 'interested') === 'interested').length;
  const callb = cachedLeads.filter(l => Boolean(l.callbackTime || l.callback_time)).length;

  if ($('cnt-enthusiastic')) $('cnt-enthusiastic').textContent = enth;
  if ($('cnt-interested')) $('cnt-interested').textContent = int;
  if ($('cnt-callback')) $('cnt-callback').textContent = callb;
}

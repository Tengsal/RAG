/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — CRM Lead Intelligence Side Drawer
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function openLeadDrawer(id) {
  const lead = leadDataMap.get(id);
  if (!lead) return;

  const g = lead.geminiSummary || {};
  const name = esc(lead.leadName || lead.lead_name || lead.lead_id || 'Prospect Student');
  const phone = esc(lead.phone || '—');
  const refId = esc(lead.leadId || lead.lead_id || '—');
  const sentiment = g.sentiment || 'interested';

  if ($('drawer-student-name')) $('drawer-student-name').textContent = name;
  if ($('drawer-student-sub')) $('drawer-student-sub').textContent = `Phone: ${phone} | Ref ID: ${refId}`;

  const sentChip = $('drawer-sentiment-chip');
  if (sentChip) {
    sentChip.textContent = `✨ ${sentiment.toUpperCase()}`;
    sentChip.className = `chip ${sentiment === 'enthusiastic' ? 'chip-green' : 'chip-amber'}`;
  }

  if ($('drawer-summary-text')) $('drawer-summary-text').textContent = g.summaryText || lead.notes || 'No AI summary generated for this call.';
  if ($('drawer-qual')) $('drawer-qual').textContent = g.keyQualification || lead.qualification || 'Not specified';
  if ($('drawer-course')) $('drawer-course').textContent = lead.interestedCourse || lead.interested_course || (g.coursesInquired || []).join(', ') || 'AdtU General';
  if ($('drawer-fees')) $('drawer-fees').textContent = g.feesDiscussed || (lead.feeStructureInquired ? 'Queried via tool call' : 'Not discussed');
  if ($('drawer-callback')) $('drawer-callback').textContent = g.callbackPreference || lead.callbackTime || lead.callback_time || 'None requested';

  // Render Action Items
  const actionsList = $('drawer-action-items-list');
  if (actionsList) {
    const items = Array.isArray(g.actionItems) && g.actionItems.length > 0 ? g.actionItems : ['Follow up with student regarding course admission details.'];
    actionsList.innerHTML = items.map((item) => `<li>${esc(item)}</li>`).join('');
  }

  // Render Transcript
  if ($('drawer-transcript')) $('drawer-transcript').textContent = lead.fullTranscript || lead.transcript || '(No raw call transcript recorded)';

  // Show Drawer Modal with smooth animation
  const backdrop = $('lead-drawer-backdrop');
  const drawer = $('lead-drawer');
  if (backdrop) {
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add('active'));
  }
  if (drawer) {
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('active'));
  }
}

function closeLeadDrawer() {
  const backdrop = $('lead-drawer-backdrop');
  const drawer = $('lead-drawer');
  if (backdrop) backdrop.classList.remove('active');
  if (drawer) drawer.classList.remove('active');
  setTimeout(() => {
    if (backdrop && !backdrop.classList.contains('active')) backdrop.hidden = true;
    if (drawer && !drawer.classList.contains('active')) drawer.hidden = true;
  }, 250);
}

// Explicit Direct Event Listeners for Close Triggers
const closeDrawerBtn = $('close-drawer-btn');
if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeLeadDrawer);

const closeDrawerFooterBtn = $('close-drawer-footer-btn');
if (closeDrawerFooterBtn) closeDrawerFooterBtn.addEventListener('click', closeLeadDrawer);

const drawerBackdrop = $('lead-drawer-backdrop');
if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeLeadDrawer);

// Delegated Click Listener & Keydown
document.addEventListener('click', (ev) => {
  const viewBtn = ev.target.closest('.btn-view-summary');
  if (viewBtn) {
    ev.preventDefault();
    openLeadDrawer(viewBtn.dataset.t);
    return;
  }

  if (ev.target.closest('#close-drawer-btn') || ev.target.closest('#close-drawer-footer-btn') || ev.target.id === 'lead-drawer-backdrop') {
    closeLeadDrawer();
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') closeLeadDrawer();
});

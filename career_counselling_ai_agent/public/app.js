/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Application Entry Point
   Initializes Core State, Polling Intervals & Modular Services
   ═══════════════════════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Mount Initial Executive Dashboard View
  switchView('dashboard');

  // Initial Data Load
  loadHealth();
  loadCourses();
  loadCalls();
  loadLeads();

  // Background Polling Intervals
  setInterval(loadCalls, 3000);
  setInterval(loadLeads, 5000);
  setInterval(loadHealth, 30000);
});

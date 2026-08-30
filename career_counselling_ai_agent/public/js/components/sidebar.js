/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Sidebar Navigation Component
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// Mobile Sidebar Toggle
const sidebarToggle = $('sidebar-toggle');
if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  });
}

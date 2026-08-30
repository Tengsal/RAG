/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Toast Notifications Generator
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function toast(msg, kind = 'info', ms = 5000) {
  const container = $('toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Core API Client & Helpers
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const API_BASE =
  location.port === '5100'
    ? ''
    : `http://localhost:${new URLSearchParams(location.search).get('api') || '5100'}`;

const $ = (id) => document.getElementById(id);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtDur(s) {
  if (s == null || isNaN(s)) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString('en-IN', { hour12: false });
}

async function api(path, opts = {}) {
  const token = localStorage.getItem('adtu_auth_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    headers: { ...headers, ...opts.headers },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// Deepgram connectivity probe (zero dependencies)
//
// The Deepgram SDK hides the HTTP status when a listen WebSocket upgrade is
// rejected ("statusCode: undefined"), which is exactly what happened in the
// failing call. This script performs the upgrade request itself with raw
// node:https so we can see the REAL status code + error body for each
// language/model combination.
//
// Usage:  node scripts/dg-probe.js
// ═══════════════════════════════════════════════════════════════════════════
'use strict';

const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

// ── Load API key from ../.env (KEY=VALUE lines) ────────────────────────────
function readEnvKey() {
  const envPath = path.join(__dirname, '..', '.env');
  const raw = fs.readFileSync(envPath, 'utf-8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^DEEPGRAM_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  throw new Error('DEEPGRAM_API_KEY not found in .env');
}

const API_KEY = readEnvKey();

// ── Probe helpers ───────────────────────────────────────────────────────────
function wsUpgrade(params) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r) => { if (!settled) { settled = true; resolve(r); } };
    const url = new URL('https://api.deepgram.com/v1/listen');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    const req = https.request(url, {
      method: 'GET',
      agent: false, // fresh socket per probe — never reuse the 400 connection
      headers: {
        Authorization: 'Token ' + API_KEY,
        Upgrade: 'websocket',
        Connection: 'Upgrade',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      },
    }, (res) => {
      res.socket.on('error', () => done({ status: 0, body: 'SOCKET ERROR after response' }));
      // For 101 the server keeps the socket open forever — destroy it once
      // the headers arrive. For 4xx, read the short JSON error body first.
      if (res.statusCode === 101) {
        res.socket.destroy();
        done({ status: 101, body: '' });
        return;
      }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => done({ status: res.statusCode, body: body.slice(0, 400) }));
      res.socket.setTimeout(5000, () => { res.socket.destroy(); done({ status: res.statusCode, body }); });
    });
    req.on('error', (e) => done({ status: 0, body: 'SOCKET ERROR: ' + e.message }));
    // A 101 fires 'upgrade' (not 'response') on the client request — the
    // server accepted the WebSocket handshake.
    req.on('upgrade', (_res, socket) => {
      socket.destroy();
      done({ status: 101, body: '' });
    });
    req.setTimeout(10000, () => { req.destroy(); done({ status: 0, body: 'TIMEOUT' }); });
    req.end();
  });
}

function checkKey() {
  return new Promise((resolve) => {
    const req = https.request('https://api.deepgram.com/v1/projects', {
      method: 'GET',
      headers: { Authorization: 'Token ' + API_KEY },
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body: body.slice(0, 300) }));
    });
    req.on('error', (e) => resolve({ status: 0, body: 'SOCKET ERROR: ' + e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });
    req.end();
  });
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log('═══ 1. API key check (GET /v1/projects) ═══');
  const key = await checkKey();
  console.log(`    → HTTP ${key.status}  ${key.body}\n`);

  const base = {
    smart_format: true,
    encoding: 'linear16',
    sample_rate: 48000,
    channels: 1,
    endpointing: 300,
    interim_results: true,
  };

  const cases = [
    { label: 'production URL (nova-2, hi-Latn)', params: { model: 'nova-2', language: 'hi-Latn', ...base } },
    { label: 'nova-2, hi           ', params: { model: 'nova-2', language: 'hi', ...base } },
    { label: 'nova-2, en-IN        ', params: { model: 'nova-2', language: 'en-IN', ...base } },
    { label: 'nova-3, hi-Latn      ', params: { model: 'nova-3', language: 'hi-Latn', ...base } },
    { label: 'nova-3, hi           ', params: { model: 'nova-3', language: 'hi', ...base } },
    { label: 'nova-2, zz (invalid) ', params: { model: 'nova-2', language: 'zz', ...base } },
  ];

  console.log('═══ 2. Listen WebSocket upgrade probes ═══');
  for (const c of cases) {
    console.log(`▶ starting: ${c.label}`);
    try {
      const r = await Promise.race([
        wsUpgrade(c.params),
        new Promise((resolve) => setTimeout(() => resolve({ status: 0, body: 'PROBE HANG — race timeout' }), 14000)),
      ]);
      const ok = r.status === 101 ? '✅ UPGRADE OK' : `❌ rejected`;
      console.log(`◀ result:   ${c.label} → HTTP ${r.status} ${ok}`);
      if (r.body && r.status !== 101) console.log(`      body: ${r.body.replace(/\s+/g, ' ')}`);
    } catch (e) {
      console.log(`◀ result:   ${c.label} → probe crashed: ${e.message}`);
    }
    console.log('');
  }
  console.log('done.');
})();

process.on('uncaughtException', (e) => console.log('UNCAUGHT:', e.message));

/* ═══════════════════════════════════════════════════════════════
   `npm run dev` — starts BOTH processes with ONE command:
     [server] tsx src/server.ts     → API + dashboard on :5100
     [worker] tsx src/worker.ts dev → LiveKit agent worker on :4043
   Zero dependencies: spawns the project's own node + tsx straight
   from node_modules (no npx, no concurrently, no network).
   Ctrl+C stops both. If one dies, the other is stopped too.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TSX = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const PROCS = [
  { name: 'server', color: '\x1b[36m', args: ['src/server.ts'] },
  { name: 'worker', color: '\x1b[35m', args: ['src/worker.ts', 'dev'] },
];

console.log('\x1b[1m🎓 Career Counselling dev — server :5100 + worker :4043\x1b[0m\n');

const children = [];
let browserOpened = false;

function openDashboard() {
  if (browserOpened) return;
  browserOpened = true;
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', 'http://localhost:5100'], {
      stdio: 'ignore',
      detached: true,
    }).unref();
  } else {
    spawn('xdg-open', ['http://localhost:5100'], { stdio: 'ignore', detached: true }).unref();
  }
  console.log('🌐 Dashboard: http://localhost:5100 (opened in your browser)');
}

for (const p of PROCS) {
  const startedAt = Date.now();
  const child = spawn(process.execPath, [TSX, ...p.args], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  const tag = `${p.color}[${p.name}]\x1b[0m `;
  const pipe = (chunk) => {
    const text = String(chunk);
    process.stdout.write(tag + text.replace(/\n$/, '').replace(/\n/g, '\n' + tag) + '\n');
    if (p.name === 'server' && text.includes('listening on http://localhost:5100')) {
      openDashboard();
    }
  };
  child.stdout.on('data', pipe);
  child.stderr.on('data', pipe);
  child.on('error', (err) => {
    console.error(`\x1b[31m[${p.name}] failed to start: ${err.message}\x1b[0m`);
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`\x1b[33m[${p.name}] exited (code ${code ?? signal}) — stopping the other process.\x1b[0m`);
    if (Date.now() - startedAt < 4000) {
      console.log(
        `\x1b[31m💡 Died within seconds of startup — usually a port conflict.\n` +
        `   Is another instance already running? Kill stale processes first:\n` +
        `   netstat -ano | findstr ":5100 :4043"   then   taskkill /F /PID <pid>\x1b[0m`,
      );
    }
    shutdown(1);
  });
  children.push(child);
}

let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n\x1b[33mShutting down…\x1b[0m');
  for (const c of children) {
    try { c.kill(); } catch (_) {}
  }
  setTimeout(() => process.exit(exitCode), 800).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

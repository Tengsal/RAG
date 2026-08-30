// Minimal logger — same shape as the main app's logger, zero dependencies.
const ts = () => new Date().toISOString();

export const logger = {
  info: (msg: string, ...args: any[]) => console.log(`${ts()} [INFO] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`${ts()} [WARN] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`${ts()} [ERROR] ${msg}`, ...args),
};

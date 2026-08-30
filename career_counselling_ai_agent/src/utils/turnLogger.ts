import { logger } from './logger';

let turnCounter = 0;

export function newTurnId(): string {
  turnCounter++;
  return `TURN_${turnCounter.toString().padStart(3, '0')}`;
}

export function turnLog(turnId: string, event: string, details?: unknown): void {
  const detailsStr = details && typeof details === 'object'
    ? ` | ${Object.entries(details as Record<string, unknown>)
      .map(([key, value]) => `${key}=${typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value)}`)
      .join(' ')}`
    : details === undefined ? '' : ` | value=${JSON.stringify(details)}`;
  logger.info(`[${turnId}] ${event}${detailsStr}`);
}

export function turnError(turnId: string, event: string, error?: unknown): void {
  const errorStr = error ? ` | ${error instanceof Error ? error.message : String(error)}` : '';
  logger.error(`[${turnId}] ❌ ${event}${errorStr}`);
}

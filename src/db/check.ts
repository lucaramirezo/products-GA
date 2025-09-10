import { getPool } from './client';

export function logPoolStatsOnce(label = 'db-pool') {
  if (process.env.NODE_ENV === 'production') return;
  const pool = getPool();
  // pequeño debounce para no spamear en HMR:
  if ((globalThis as any).__printedPoolStats) return;
  (globalThis as any).__printedPoolStats = true;

  // Espera breve para que el pool inicialice:
  setTimeout(() => {
    console.log(`[${label}] total=${pool.totalCount} idle=${pool.idleCount} waiting=${pool.waitingCount}`);
  }, 250);
}

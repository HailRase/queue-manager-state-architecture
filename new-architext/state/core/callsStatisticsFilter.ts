import { CallsStatistics } from 'shared/db-types';

import { CALLS_STATISTICS_TTL_MS } from './constants';

export function filterCallsStatistics24h(
  items: CallsStatistics[],
  now = Date.now()
): CallsStatistics[] {
  const cutoff = now - CALLS_STATISTICS_TTL_MS;
  return items.filter((call) => call.ts_start >= cutoff);
}

export function pruneCallsStatisticsRecord(
  record: Record<string, CallsStatistics>,
  now = Date.now()
): Record<string, CallsStatistics> {
  const cutoff = now - CALLS_STATISTICS_TTL_MS;
  const next: Record<string, CallsStatistics> = {};
  for (const [id, call] of Object.entries(record)) {
    if (call.ts_start >= cutoff) {
      next[id] = call;
    }
  }
  return next;
}

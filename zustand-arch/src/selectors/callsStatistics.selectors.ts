/**
 * - purpose: ready-made selectors for callsStatisticsStore consumers
 * - inputs: queueId / id / nothing
 * - outputs: hooks returning Set, item, count, or stable array (via version)
 * - constraint: array view memoized by monotonic version, never inside setState
 * - usage: prefer these over inline selectors in components
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { CallsStatistics } from '../../../src/shared/db-types';
import { useCallsStatisticsStore } from '../stores/callsStatisticsStore';
import { useStableArrayFromMap } from '../utils/stableArrayFromMap';

const EMPTY_ID_SET: ReadonlySet<string> = new Set<string>();

export const useCallsStatisticsByQueue = (queueId: number): ReadonlySet<string> => {
  return useCallsStatisticsStore(
    useShallow((s) => s.byQueue.get(queueId) ?? EMPTY_ID_SET)
  );
};

export const useCallsStatisticsByQueueItems = (queueId: number): readonly CallsStatistics[] => {
  const ids = useCallsStatisticsByQueue(queueId);
  const byId = useCallsStatisticsStore((s) => s.byId);
  const version = useCallsStatisticsStore((s) => s.version);
  return useMemo(() => {
    const out: CallsStatistics[] = [];
    for (const id of ids) {
      const item = byId.get(id);
      if (item) out.push(item);
    }
    return out;
  }, [ids, byId, version]);
};

export const useCallsStatisticsById = (id: string): CallsStatistics | undefined => {
  return useCallsStatisticsStore((s) => s.byId.get(id));
};

export const useCallsStatisticsSize = (): number => {
  return useCallsStatisticsStore((s) => s.byId.size);
};

export const useCallsStatisticsList = (): readonly CallsStatistics[] => {
  const byId = useCallsStatisticsStore((s) => s.byId);
  const version = useCallsStatisticsStore((s) => s.version);
  return useStableArrayFromMap(byId, version);
};

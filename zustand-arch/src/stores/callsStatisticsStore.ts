/**
 * - purpose: hot-path live store for 24h calls_statistics window
 * - inputs: CallsStatistics[] batches from wsBridge (already 24h-filtered)
 * - outputs: byId Map, byQueue index, monotonic version, upsertBatch/remove/clear
 * - invariant: never calls Array.from inside setState; version++ per mutation batch
 * - middleware: immer + subscribeWithSelector + devtools (DEV only)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { CallsStatistics } from '../../../src/shared/db-types';
import { withDevtools } from '../middleware/withDevtools';

export interface CallsStatisticsState {
  byId: Map<string, CallsStatistics>;
  byQueue: Map<number, Set<string>>;
  version: number;
  upsertBatch: (items: readonly CallsStatistics[]) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const addToQueueIndex = (
  byQueue: Map<number, Set<string>>,
  queueId: number,
  id: string
): void => {
  const set = byQueue.get(queueId);
  if (set) {
    set.add(id);
    return;
  }
  byQueue.set(queueId, new Set<string>([id]));
};

const removeFromQueueIndex = (
  byQueue: Map<number, Set<string>>,
  queueId: number,
  id: string
): void => {
  const set = byQueue.get(queueId);
  if (!set) return;
  set.delete(id);
  if (set.size === 0) byQueue.delete(queueId);
};

const baseInitializer = immer<CallsStatisticsState>((set) => ({
  byId: new Map<string, CallsStatistics>(),
  byQueue: new Map<number, Set<string>>(),
  version: 0,
  upsertBatch: (items) => {
    if (items.length === 0) return;
    set((state) => {
      for (const item of items) {
        const previous = state.byId.get(item.id);
        if (previous && previous.queue_id !== item.queue_id) {
          removeFromQueueIndex(state.byQueue, previous.queue_id, item.id);
        }
        state.byId.set(item.id, item);
        addToQueueIndex(state.byQueue, item.queue_id, item.id);
      }
      state.version += 1;
    });
  },
  remove: (id) => {
    set((state) => {
      const previous = state.byId.get(id);
      if (!previous) return;
      state.byId.delete(id);
      removeFromQueueIndex(state.byQueue, previous.queue_id, id);
      state.version += 1;
    });
  },
  clear: () => {
    set((state) => {
      if (state.byId.size === 0 && state.byQueue.size === 0) return;
      state.byId.clear();
      state.byQueue.clear();
      state.version += 1;
    });
  },
}));

export const useCallsStatisticsStore = create<CallsStatisticsState>()(
  subscribeWithSelector(withDevtools('callsStatisticsStore', baseInitializer))
);

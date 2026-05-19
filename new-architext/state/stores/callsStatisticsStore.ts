import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { CallsStatistics } from 'shared/db-types';

import { createMessageBatcher } from '../core/batchScheduler';
import {
  CALLS_STATISTICS_TTL_MS,
  HOT_STREAM_FLUSH_MS,
  MAX_BATCH_QUEUE_SIZE,
} from '../core/constants';
import {
  filterCallsStatistics24h,
  pruneCallsStatisticsRecord,
} from '../core/callsStatisticsFilter';
import {
  applyEntityMapMessage,
  coalesceEntityMapMessages,
  mapToRecord,
} from '../core/entityMapApply';
import {
  CallsStatisticsEntity,
  CallsStatisticsWsMessage,
} from '../core/streamEntityTypes';
import { isCallsStatisticsWsMessage } from '../core/typeGuards';

interface CallsStatisticsState {
  byId: Record<string, CallsStatistics>;
  revision: number;
  commitStaging: () => void;
  reset: () => void;
}

const stagingMap = new Map<string, CallsStatistics>();

const coalesceCallsStatistics = (
  messages: CallsStatisticsWsMessage[]
): CallsStatisticsWsMessage[] =>
  coalesceEntityMapMessages<CallsStatistics, CallsStatisticsEntity>(messages);

const batcher = createMessageBatcher<CallsStatisticsWsMessage>({
  flushIntervalMs: HOT_STREAM_FLUSH_MS,
  maxQueueSize: MAX_BATCH_QUEUE_SIZE,
  coalesce: coalesceCallsStatistics,
  onFlush: (messages) => {
    for (const msg of messages) {
      applyEntityMapMessage(stagingMap, msg);
    }
    useCallsStatisticsStore.getState().commitStaging();
  },
});

export const useCallsStatisticsStore = create<CallsStatisticsState>()(
  subscribeWithSelector((set, get) => ({
    byId: {},
    revision: 0,

    commitStaging: () => {
      if (stagingMap.size === 0) return;

      const merged = { ...get().byId };
      for (const [id, item] of stagingMap) {
        merged[id] = item;
      }
      stagingMap.clear();

      const pruned = pruneCallsStatisticsRecord(merged);
      set((state) => ({
        byId: pruned,
        revision: state.revision + 1,
      }));
    },

    reset: () => {
      stagingMap.clear();
      batcher.flushNow();
      set({ byId: {}, revision: 0 });
    },
  }))
);

export const enqueueCallsStatisticsMessage = (
  message: CallsStatisticsWsMessage
): void => {
  if (message.action === 'bulkPut') {
    const filtered = filterCallsStatistics24h(message.payload);
    if (filtered.length === 0) return;
    batcher.push({ ...message, payload: filtered });
    return;
  }
  batcher.push(message);
};

export const enqueueCallsStatisticsMessageSafe = (
  message: unknown
): message is CallsStatisticsWsMessage => {
  if (!isCallsStatisticsWsMessage(message)) {
    return false;
  }
  enqueueCallsStatisticsMessage(message);
  return true;
};

export const flushCallsStatisticsNow = (): void => batcher.flushNow();

export const selectCallsStatisticsList = (
  state: CallsStatisticsState
): CallsStatistics[] => Object.values(state.byId);

export const selectCallsStatisticsCount = (
  state: CallsStatisticsState
): number => Object.keys(state.byId).length;

export const getCallsStatisticsStagingSize = (): number => stagingMap.size;

export const exportCallsStatisticsSnapshot = (): Record<string, CallsStatistics> =>
  mapToRecord(stagingMap);

export const CALLS_STATISTICS_STORE_TTL_MS = CALLS_STATISTICS_TTL_MS;

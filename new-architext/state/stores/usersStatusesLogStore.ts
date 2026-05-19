import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ILogUserStatus } from 'shared/db-types';

import { createMessageBatcher } from '../core/batchScheduler';
import { HOT_STREAM_FLUSH_MS, MAX_BATCH_QUEUE_SIZE } from '../core/constants';
import {
  applyEntityMapMessage,
  coalesceEntityMapMessages,
} from '../core/entityMapApply';
import {
  UsersStatusesLogEntity,
  UsersStatusesLogWsMessage,
} from '../core/streamEntityTypes';
import { isUsersStatusesLogWsMessage } from '../core/typeGuards';

interface UsersStatusesLogState {
  byId: Record<string, ILogUserStatus>;
  revision: number;
  commitStaging: () => void;
  reset: () => void;
}

const stagingMap = new Map<number, ILogUserStatus>();

const coalesceUsersStatusesLog = (
  messages: UsersStatusesLogWsMessage[]
): UsersStatusesLogWsMessage[] =>
  coalesceEntityMapMessages<ILogUserStatus, UsersStatusesLogEntity>(messages);

const batcher = createMessageBatcher<UsersStatusesLogWsMessage>({
  flushIntervalMs: HOT_STREAM_FLUSH_MS,
  maxQueueSize: MAX_BATCH_QUEUE_SIZE,
  coalesce: coalesceUsersStatusesLog,
  onFlush: (messages) => {
    for (const msg of messages) {
      applyEntityMapMessage(stagingMap, msg);
    }
    useUsersStatusesLogStore.getState().commitStaging();
  },
});

export const useUsersStatusesLogStore = create<UsersStatusesLogState>()(
  subscribeWithSelector((set, get) => ({
    byId: {},
    revision: 0,

    commitStaging: () => {
      if (stagingMap.size === 0) return;
      const merged = { ...get().byId };
      for (const [id, item] of stagingMap) {
        merged[String(id)] = item;
      }
      stagingMap.clear();
      set((state) => ({
        byId: merged,
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

export const enqueueUsersStatusesLogMessage = (
  message: UsersStatusesLogWsMessage
): void => {
  batcher.push(message);
};

export const enqueueUsersStatusesLogMessageSafe = (
  message: unknown
): message is UsersStatusesLogWsMessage => {
  if (!isUsersStatusesLogWsMessage(message)) {
    return false;
  }
  enqueueUsersStatusesLogMessage(message);
  return true;
};

export const selectUsersStatusesLogList = (
  state: UsersStatusesLogState
): ILogUserStatus[] => Object.values(state.byId);

/**
 * - purpose: hot-path live store for user status change log
 * - inputs: ILogUserStatus[] batches from wsBridge
 * - outputs: byId Map, byUser index, monotonic version, upsertBatch/remove/clear
 * - invariant: never calls Array.from inside setState; version++ per mutation batch
 * - middleware: immer + subscribeWithSelector + devtools (DEV only)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { ILogUserStatus } from '../../../src/shared/db-types';
import { withDevtools } from '../middleware/withDevtools';

export interface UsersStatusesLogState {
  byId: Map<number, ILogUserStatus>;
  byUser: Map<number, Set<number>>;
  version: number;
  upsertBatch: (items: readonly ILogUserStatus[]) => void;
  remove: (id: number) => void;
  clear: () => void;
}

const addToUserIndex = (
  byUser: Map<number, Set<number>>,
  userId: number,
  id: number
): void => {
  const set = byUser.get(userId);
  if (set) {
    set.add(id);
    return;
  }
  byUser.set(userId, new Set<number>([id]));
};

const removeFromUserIndex = (
  byUser: Map<number, Set<number>>,
  userId: number,
  id: number
): void => {
  const set = byUser.get(userId);
  if (!set) return;
  set.delete(id);
  if (set.size === 0) byUser.delete(userId);
};

const baseInitializer = immer<UsersStatusesLogState>((set) => ({
  byId: new Map<number, ILogUserStatus>(),
  byUser: new Map<number, Set<number>>(),
  version: 0,
  upsertBatch: (items) => {
    if (items.length === 0) return;
    set((state) => {
      for (const item of items) {
        const previous = state.byId.get(item.id);
        if (previous && previous.operator_id !== item.operator_id) {
          removeFromUserIndex(state.byUser, previous.operator_id, item.id);
        }
        state.byId.set(item.id, item);
        addToUserIndex(state.byUser, item.operator_id, item.id);
      }
      state.version += 1;
    });
  },
  remove: (id) => {
    set((state) => {
      const previous = state.byId.get(id);
      if (!previous) return;
      state.byId.delete(id);
      removeFromUserIndex(state.byUser, previous.operator_id, id);
      state.version += 1;
    });
  },
  clear: () => {
    set((state) => {
      if (state.byId.size === 0 && state.byUser.size === 0) return;
      state.byId.clear();
      state.byUser.clear();
      state.version += 1;
    });
  },
}));

export const useUsersStatusesLogStore = create<UsersStatusesLogState>()(
  subscribeWithSelector(withDevtools('usersStatusesLogStore', baseInitializer))
);

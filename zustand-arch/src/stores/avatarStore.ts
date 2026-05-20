/**
 * - purpose: per-user avatar version counter for cache invalidation
 * - inputs: invalidate(userId) from upload/delete flows
 * - outputs: versions Map, invalidate(userId), getVersion(userId)
 * - replaces: local Map<userId, Set<Listener>> pub/sub in useAvatar
 * - middleware: immer + subscribeWithSelector
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { withDevtools } from '../middleware/withDevtools';

export interface AvatarState {
  versions: Map<number, number>;
  invalidate: (userId: number) => void;
  getVersion: (userId: number) => number;
  reset: () => void;
}

const baseInitializer = immer<AvatarState>((set, get) => ({
  versions: new Map<number, number>(),
  invalidate: (userId) => {
    set((state) => {
      const current = state.versions.get(userId) ?? 0;
      state.versions.set(userId, current + 1);
    });
  },
  getVersion: (userId) => get().versions.get(userId) ?? 0,
  reset: () => {
    set((state) => {
      if (state.versions.size === 0) return;
      state.versions.clear();
    });
  },
}));

export const useAvatarStore = create<AvatarState>()(
  subscribeWithSelector(withDevtools('avatarStore', baseInitializer))
);

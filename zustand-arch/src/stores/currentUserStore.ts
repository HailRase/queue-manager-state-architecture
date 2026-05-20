/**
 * - purpose: hold ICurrentUser populated by dexieBridge from db.current_user
 * - inputs: ICurrentUser | null from bridge
 * - outputs: user, set(user), reset()
 * - replaces: useCurrentUser hook + current_user useLiveQuery callers
 * - constraint: never reads localStorage directly (sid lives in appSettingsStore)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { ICurrentUser } from '../../../src/types/currentUser';
import { withDevtools } from '../middleware/withDevtools';

export interface CurrentUserState {
  user: ICurrentUser | null;
  set: (user: ICurrentUser | null) => void;
  reset: () => void;
}

export const useCurrentUserStore = create<CurrentUserState>()(
  subscribeWithSelector(
    withDevtools('currentUserStore', (set) => ({
      user: null,
      set: (user) => set({ user }),
      reset: () => set({ user: null }),
    }))
  )
);

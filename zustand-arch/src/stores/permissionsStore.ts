/**
 * - purpose: flat sorted list of permission codes for current user
 * - inputs: merged permissions from dexieBridge (current_user -> roles -> permissions)
 * - outputs: permissions array, set(list), has(code), reset()
 * - constraint: dexieBridge does the merge; this store stores the result only
 * - replaces: PermissionsProvider + usePermissions hook
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { withDevtools } from '../middleware/withDevtools';

export interface PermissionsState {
  permissions: string[];
  set: (permissions: readonly string[]) => void;
  has: (code: string) => boolean;
  reset: () => void;
}

export const usePermissionsStore = create<PermissionsState>()(
  subscribeWithSelector(
    withDevtools('permissionsStore', (set, get) => ({
      permissions: [],
      set: (permissions) => set({ permissions: [...permissions] }),
      has: (code) => get().permissions.includes(code),
      reset: () => set({ permissions: [] }),
    }))
  )
);

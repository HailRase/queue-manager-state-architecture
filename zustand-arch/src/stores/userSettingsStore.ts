/**
 * - purpose: current user UI settings populated by dexieBridge
 * - inputs: UserSettings from db.user_settings derived view
 * - outputs: settings object, set(settings), reset()
 * - replaces: UserSettingsProvider + useUserSettings
 * - constraint: persistence stays in Dexie; this store is a derived cache
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { UserSettings } from '../../../src/shared/db-types';
import { withDevtools } from '../middleware/withDevtools';

export interface UserSettingsState {
  settings: UserSettings;
  set: (settings: UserSettings) => void;
  reset: () => void;
}

const EMPTY_SETTINGS: UserSettings = {};

export const useUserSettingsStore = create<UserSettingsState>()(
  subscribeWithSelector(
    withDevtools('userSettingsStore', (set) => ({
      settings: EMPTY_SETTINGS,
      set: (settings) => set({ settings }),
      reset: () => set({ settings: EMPTY_SETTINGS }),
    }))
  )
);

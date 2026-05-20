/**
 * - purpose: legacy-compatible drop-in for src/hooks/useUserSettings
 * - inputs: none
 * - outputs: UserSettings object (empty object when not loaded)
 * - constraint: reads from userSettingsStore (populated by dexieBridge)
 * - removal: replace with direct selector after migration step 5
 */

import type { UserSettings } from '../../../src/shared/db-types';
import { useUserSettingsStore } from '../stores/userSettingsStore';

export const useUserSettings = (): UserSettings =>
  useUserSettingsStore((s) => s.settings);

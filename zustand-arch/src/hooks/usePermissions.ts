/**
 * - purpose: legacy-compatible drop-in for src/hooks/usePermissions
 * - inputs: none
 * - outputs: string[] permission codes
 * - constraint: reads from permissionsStore (populated by dexieBridge)
 * - removal: replace with usePermissionsList from selectors
 */

import { useShallow } from 'zustand/react/shallow';

import { usePermissionsStore } from '../stores/permissionsStore';

export const usePermissions = (): string[] => {
  const permissions = usePermissionsStore(useShallow((s) => s.permissions));
  return permissions as string[];
};

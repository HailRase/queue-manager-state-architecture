/**
 * - purpose: permission checks and permission list selectors
 * - inputs: permission code string
 * - outputs: boolean has-check, array list (shallow stable)
 * - usage: hasPermission for non-React utility code; hook for components
 */

import { useShallow } from 'zustand/react/shallow';

import { usePermissionsStore } from '../stores/permissionsStore';

export const hasPermission = (code: string): boolean =>
  usePermissionsStore.getState().permissions.includes(code);

export const useHasPermission = (code: string): boolean =>
  usePermissionsStore((s) => s.permissions.includes(code));

export const usePermissionsList = (): readonly string[] =>
  usePermissionsStore(useShallow((s) => s.permissions));

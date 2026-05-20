/**
 * - purpose: typed slice selector for tableDataStore
 * - inputs: entity key (calls / operator_status_history / company / ...)
 * - outputs: EntitySlice<TableData[K]> with shallow stable reference
 * - constraint: uses useShallow to avoid spurious rerenders on unrelated slices
 * - usage: useTableSlice('calls'), useTableSliceIsLoading('calls')
 */

import { useShallow } from 'zustand/react/shallow';

import { useTableDataStore } from '../stores/tableDataStore';
import type { EntityKey, EntitySlice, TableData } from '../types/tables';

export const useTableSlice = <K extends EntityKey>(
  key: K
): EntitySlice<TableData[K]> => {
  return useTableDataStore(
    useShallow((s) => s.slices[key] as EntitySlice<TableData[K]>)
  );
};

export const useTableSliceItems = <K extends EntityKey>(
  key: K
): readonly TableData[K][] => {
  return useTableDataStore(
    useShallow((s) => (s.slices[key] as EntitySlice<TableData[K]>).items)
  );
};

export const useTableSliceIsLoading = (key: EntityKey): boolean => {
  return useTableDataStore((s) => s.slices[key].isLoading);
};

export const useTableSlicePagination = (
  key: EntityKey
): { page: number; pages: number; size: number; total: number } => {
  return useTableDataStore(
    useShallow((s) => {
      const slice = s.slices[key];
      return {
        page: slice.page,
        pages: slice.pages,
        size: slice.size,
        total: slice.total,
      };
    })
  );
};

/**
 * - purpose: legacy-compatible API of TableDataProvider's useTableDataContext
 * - inputs: none
 * - outputs: { tableData, dispatchQuery, dispatch } matching legacy provider
 * - constraint: builds tableData via useShallow over all 6 entity slices
 * - removal: replace consumers with useTableSlice(k) after migration step 3
 */

import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { ENTITY_KEYS, useTableDataStore } from '../stores/tableDataStore';
import type {
  EntityKey,
  TableDataState,
  TableWSMessage,
} from '../types/tables';

export const useTableDataContext = (): {
  tableData: TableDataState;
  dispatch: (msg: TableWSMessage) => void;
  dispatchQuery: (entity: EntityKey) => void;
} => {
  const tableData = useTableDataStore(
    useShallow((s) => s.slices as unknown as TableDataState)
  );
  const dispatch = useCallback((msg: TableWSMessage) => {
    useTableDataStore.getState().applyMessage(msg);
  }, []);
  const dispatchQuery = useCallback((entity: EntityKey) => {
    if (!ENTITY_KEYS.includes(entity)) return;
    useTableDataStore.getState().applyMessage({ entity, action: 'query' } as TableWSMessage);
  }, []);
  return { tableData, dispatch, dispatchQuery };
};

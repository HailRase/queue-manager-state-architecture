/**
 * - purpose: server-paginated table data store, 6 entity slices
 * - inputs: TableWSMessage from wsBridge or setLoading from React
 * - outputs: slices map + applyMessage/setLoading actions
 * - invariant: action semantics 1:1 with legacy tableDataReducer
 * - middleware: immer + subscribeWithSelector + devtools (DEV only)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { withDevtools } from '../middleware/withDevtools';
import type {
  EntityKey,
  EntitySlice,
  SlicesMap,
  TableData,
  TableWSMessage,
} from '../types/tables';

const ENTITY_KEYS: readonly EntityKey[] = [
  'calls',
  'operator_status_history',
  'company',
  'strategy_call',
  'selection',
  'abonents_lists',
];

const makeInitialSlice = <K extends EntityKey>(): EntitySlice<TableData[K]> => ({
  items: [],
  page: 1,
  pages: 0,
  size: 10,
  total: 0,
  isLoading: false,
  updatedAt: Date.now(),
});

const makeInitialSlices = (): SlicesMap =>
  ENTITY_KEYS.reduce<SlicesMap>((acc, key) => {
    acc[key] = makeInitialSlice() as SlicesMap[typeof key];
    return acc;
  }, {} as SlicesMap);

export interface TableDataStoreState {
  slices: SlicesMap;
  applyMessage: (msg: TableWSMessage) => void;
  setLoading: (entity: EntityKey) => void;
}

const isKnownEntity = (entity: string): entity is EntityKey =>
  (ENTITY_KEYS as readonly string[]).includes(entity);

const baseInitializer = immer<TableDataStoreState>((set) => ({
  slices: makeInitialSlices(),
  applyMessage: (msg) => {
    if (!isKnownEntity(msg.entity)) return;
    set((state) => {
      const slice = state.slices[msg.entity] as EntitySlice<unknown>;
      const now = Date.now();
      switch (msg.action) {
        case 'bulkPut': {
          slice.items = msg.payload.items as unknown[];
          slice.page = msg.payload.page;
          slice.pages = msg.payload.pages;
          slice.size = msg.payload.size;
          slice.total = msg.payload.total;
          slice.isLoading = false;
          slice.updatedAt = now;
          return;
        }
        case 'put': {
          const item = msg.payload as { id: string | number };
          const index = slice.items.findIndex(
            (i) => (i as { id: string | number }).id === item.id
          );
          if (index !== -1) {
            slice.items = [
              item,
              ...slice.items.slice(0, index),
              ...slice.items.slice(index + 1),
            ];
          } else {
            slice.items = [item, ...slice.items];
          }
          slice.updatedAt = now;
          return;
        }
        case 'add': {
          const item = msg.payload as { id: string | number };
          const exists = slice.items.some(
            (i) => (i as { id: string | number }).id === item.id
          );
          if (exists) return;
          slice.items = [item, ...slice.items];
          slice.updatedAt = now;
          return;
        }
        case 'delete': {
          const target = msg.payload;
          slice.items = slice.items.filter(
            (i) => (i as { id: string | number }).id !== target
          );
          slice.updatedAt = now;
          return;
        }
        case 'query': {
          slice.isLoading = true;
          return;
        }
        default:
          return;
      }
    });
  },
  setLoading: (entity) => {
    if (!isKnownEntity(entity)) return;
    set((state) => {
      state.slices[entity].isLoading = true;
    });
  },
}));

export const useTableDataStore = create<TableDataStoreState>()(
  subscribeWithSelector(withDevtools('tableDataStore', baseInitializer))
);

export { ENTITY_KEYS };

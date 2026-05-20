/**
 * - purpose: persisted app-wide settings: sid, table configs, quick filters
 * - inputs: setters from auth/table/filter components
 * - outputs: sid, tableConfig, quickFilters, version + setters
 * - persistence: localStorage; partializer guarantees only allowed keys leave
 * - migrate: identity, version-bumped manually on schema changes
 */

import { create } from 'zustand';
import { persist, type PersistOptions } from 'zustand/middleware';

const PERSIST_KEY = 'queue-manager-ui:appSettings';
const PERSIST_VERSION = 1;

export type TableConfig = Record<string, unknown>;
export type QuickFiltersConfig = Record<string, unknown>;

export interface AppSettingsState {
  sid: string | null;
  tableConfig: Record<string, TableConfig>;
  quickFilters: Record<string, QuickFiltersConfig>;
  version: number;
  setSid: (sid: string | null) => void;
  setTableConfig: (key: string, value: TableConfig) => void;
  removeTableConfig: (key: string) => void;
  setQuickFilters: (key: string, value: QuickFiltersConfig) => void;
  removeQuickFilters: (key: string) => void;
  clearAll: () => void;
}

interface PersistedShape {
  sid: AppSettingsState['sid'];
  tableConfig: AppSettingsState['tableConfig'];
  quickFilters: AppSettingsState['quickFilters'];
  version: AppSettingsState['version'];
}

const persistOptions: PersistOptions<AppSettingsState, PersistedShape> = {
  name: PERSIST_KEY,
  version: PERSIST_VERSION,
  partialize: (state) => ({
    sid: state.sid,
    tableConfig: state.tableConfig,
    quickFilters: state.quickFilters,
    version: state.version,
  }),
  migrate: (persisted, fromVersion) => {
    if (fromVersion === PERSIST_VERSION) return persisted as PersistedShape;
    return {
      sid: null,
      tableConfig: {},
      quickFilters: {},
      version: PERSIST_VERSION,
    };
  },
};

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      sid: null,
      tableConfig: {},
      quickFilters: {},
      version: PERSIST_VERSION,
      setSid: (sid) => set({ sid }),
      setTableConfig: (key, value) =>
        set((state) => ({
          tableConfig: { ...state.tableConfig, [key]: value },
        })),
      removeTableConfig: (key) =>
        set((state) => {
          if (!(key in state.tableConfig)) return state;
          const next = { ...state.tableConfig };
          delete next[key];
          return { tableConfig: next };
        }),
      setQuickFilters: (key, value) =>
        set((state) => ({
          quickFilters: { ...state.quickFilters, [key]: value },
        })),
      removeQuickFilters: (key) =>
        set((state) => {
          if (!(key in state.quickFilters)) return state;
          const next = { ...state.quickFilters };
          delete next[key];
          return { quickFilters: next };
        }),
      clearAll: () =>
        set({
          sid: null,
          tableConfig: {},
          quickFilters: {},
          version: PERSIST_VERSION,
        }),
    }),
    persistOptions
  )
);

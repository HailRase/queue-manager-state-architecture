import { TableDataState } from 'app/providers/TableDataProvider/model/types';

const emptyEntityState = {
  items: [],
  page: 1,
  pages: 0,
  size: 10,
  total: 0,
  isLoading: false,
  updatedAt: Date.now(),
} as const;

export const tableDataInitialState: TableDataState = {
  calls: { ...emptyEntityState, items: [] },
  operator_status_history: { ...emptyEntityState, items: [] },
  company: { ...emptyEntityState, items: [] },
  strategy_call: { ...emptyEntityState, items: [] },
  selection: { ...emptyEntityState, items: [] },
  abonents_lists: { ...emptyEntityState, items: [] },
};

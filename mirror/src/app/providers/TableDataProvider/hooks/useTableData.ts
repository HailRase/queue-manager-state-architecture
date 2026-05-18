import { useCallback, useReducer } from 'react';
import { TableDataEntityNames } from 'types/settings';

import { tableDataInitialState, tableDataReducer } from './reducer';

export const useTableData = () => {
  const [tableData, dispatch] = useReducer(
    tableDataReducer,
    tableDataInitialState
  );
  const dispatchQuery = useCallback(
    (entity: TableDataEntityNames) => dispatch({ action: 'query', entity }),
    [dispatch]
  );

  return { tableData, dispatchQuery, dispatch };
};

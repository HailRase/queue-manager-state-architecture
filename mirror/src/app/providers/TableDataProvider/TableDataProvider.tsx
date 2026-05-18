import React, {
  ActionDispatch,
  createContext,
  ReactNode,
  useContext,
} from 'react';
import { TableDataEntityNames } from 'types/settings';

import { useTableData } from './hooks/useTableData';
import { TableDataState, TableWSMessage } from './model/types';

interface TableDataContext {
  tableData: TableDataState;
  dispatchQuery: (entity: TableDataEntityNames) => void;
  dispatch: ActionDispatch<[msg: TableWSMessage]>;
}
const TableDataContext = createContext<TableDataContext | undefined>(undefined);
export const useTableDataContext = () => {
  const context = useContext(TableDataContext);
  if (!context) {
    throw new Error(
      'useTableDataContext must be used within a TableDataProvider'
    );
  }
  return context;
};
interface TableDataProvider {
  children: ReactNode;
}
export const TableDataProvider: React.FC<TableDataProvider> = ({
  children,
}) => {
  const { tableData, dispatchQuery, dispatch } = useTableData();
  return (
    <TableDataContext.Provider value={{ tableData, dispatchQuery, dispatch }}>
      {children}
    </TableDataContext.Provider>
  );
};

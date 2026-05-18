import { OperatorStatusSchema } from 'features/User';
import {
  DetailCallSchema as Call,
  DetailCompanySerializer as Company,
  ListAbonentsListsSerializer as AbonentsList,
  RetrieveSelectionSchema as Selection,
  RetrieveStrategyCallSchema as StrategyCall,
} from 'shared/api-types';

export interface TableData {
  calls: Call;
  operator_status_history: OperatorStatusSchema;
  company: Company;
  strategy_call: StrategyCall;
  selection: Selection;
  abonents_lists: AbonentsList;
}

export type TableEntityKey = keyof TableData;

export type TableItem<K extends TableEntityKey> = TableData[K];

export interface TableEntityState<T> {
  items: T[];
  page: number;
  pages: number;
  size: number;
  total: number;
  isLoading: boolean;
  updatedAt: number;
}

export type TableDataState = {
  [K in TableEntityKey]: TableEntityState<TableData[K]>;
};
export type TableDataTypes = TableData[keyof TableData];

interface BaseMessage<K extends TableEntityKey> {
  entity: K;
}

export type BulkPutMessage<K extends TableEntityKey> = BaseMessage<K> & {
  action: 'bulkPut';
  payload: {
    items: TableItem<K>[];
    page: number;
    pages: number;
    size: number;
    total: number;
  };
};

export type PutMessage<K extends TableEntityKey> = BaseMessage<K> & {
  action: 'put';
  payload: TableItem<K>;
};

export type AddMessage<K extends TableEntityKey> = BaseMessage<K> & {
  action: 'add';
  payload: TableItem<K>;
};

export type DeleteMessage<K extends TableEntityKey> = BaseMessage<K> & {
  action: 'delete';
  payload: string | number;
};

export type QueryMessage<K extends TableEntityKey> = BaseMessage<K> & {
  action: 'query';
};

export type TableWSMessage = {
  [K in TableEntityKey]:
    | BulkPutMessage<K>
    | PutMessage<K>
    | AddMessage<K>
    | DeleteMessage<K>
    | QueryMessage<K>;
}[TableEntityKey];

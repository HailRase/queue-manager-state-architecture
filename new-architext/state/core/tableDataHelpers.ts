import {
  QueryMessage,
  TableEntityKey,
  TableWSMessage,
} from 'app/providers/TableDataProvider/model/types';
import { TableDataEntityNames } from 'types/settings';

import { tableDataInitialState } from './tableDataInitialState';

export const TABLE_ENTITY_KEYS = Object.keys(
  tableDataInitialState
) as TableEntityKey[];

export const isTableEntityKey = (value: string): value is TableEntityKey =>
  (TABLE_ENTITY_KEYS as readonly string[]).includes(value);

export const createTableQueryMessage = <K extends TableEntityKey>(
  entity: K
): QueryMessage<K> => ({
  entity,
  action: 'query',
});

export const toTableQueryMessage = (
  entity: TableDataEntityNames
): TableWSMessage => createTableQueryMessage(entity);

export const getTableMessageCoalesceKey = (msg: TableWSMessage): string => {
  switch (msg.action) {
    case 'query':
      return `${msg.entity}:query`;
    case 'delete':
      return `${msg.entity}:delete:${String(msg.payload)}`;
    case 'bulkPut':
      return `${msg.entity}:bulkPut`;
    case 'put':
    case 'add':
      return `${msg.entity}:${msg.action}:${String(msg.payload.id)}`;
    default: {
      const _exhaustive: never = msg;
      return _exhaustive;
    }
  }
};

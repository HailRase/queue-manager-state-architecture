/**
 * - purpose: table-slice types reused 1:1 from TableDataProvider model
 * - inputs: none
 * - outputs: EntityKey, EntitySlice, TableWSMessage, TableDataState
 * - source: src/app/providers/TableDataProvider/model/types.ts
 * - boundary: only typed message shape crosses into tableDataStore
 */

import type {
  TableData,
  TableEntityKey,
  TableEntityState,
} from '../../../src/app/providers/TableDataProvider/model/types';

export type {
  TableData,
  TableDataState,
  TableDataTypes,
  TableEntityKey,
  TableEntityState,
  TableItem,
  TableWSMessage,
  BulkPutMessage,
  PutMessage,
  AddMessage,
  DeleteMessage,
  QueryMessage,
} from '../../../src/app/providers/TableDataProvider/model/types';

export type EntityKey = TableEntityKey;

export type EntitySlice<T> = TableEntityState<T>;

export type SlicesMap = { [K in EntityKey]: EntitySlice<TableData[K]> };

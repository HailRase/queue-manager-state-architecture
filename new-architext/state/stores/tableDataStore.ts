import {
  TableDataState,
  TableWSMessage,
} from 'app/providers/TableDataProvider/model/types';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { TableDataEntityNames } from 'types/settings';

import { createMessageBatcher } from '../core/batchScheduler';
import { MAX_BATCH_QUEUE_SIZE, TABLE_STREAM_FLUSH_MS } from '../core/constants';
import {
  applyTableDataMessage,
  applyTableDataMessageBatch,
} from '../core/tableDataApply';
import { tableDataInitialState } from '../core/tableDataInitialState';
import { toTableQueryMessage } from '../core/tableDataHelpers';
import { isTableWSMessage } from '../core/typeGuards';

interface TableDataStoreState {
  tableData: TableDataState;
  revision: number;
  applyMessage: (msg: TableWSMessage) => void;
  applyBatch: (messages: TableWSMessage[]) => void;
  dispatchQuery: (entity: TableDataEntityNames) => void;
  reset: () => void;
}

const batcher = createMessageBatcher<TableWSMessage>({
  flushIntervalMs: TABLE_STREAM_FLUSH_MS,
  maxQueueSize: MAX_BATCH_QUEUE_SIZE,
  onFlush: (messages) => {
    useTableDataStore.getState().applyBatch(messages);
  },
});

export const useTableDataStore = create<TableDataStoreState>()(
  subscribeWithSelector((set, get) => ({
    tableData: tableDataInitialState,
    revision: 0,

    applyMessage: (msg) => {
      set((state) => ({
        tableData: applyTableDataMessage(state.tableData, msg),
        revision: state.revision + 1,
      }));
    },

    applyBatch: (messages) => {
      if (messages.length === 0) return;
      set((state) => ({
        tableData: applyTableDataMessageBatch(state.tableData, messages),
        revision: state.revision + 1,
      }));
    },

    dispatchQuery: (entity) => {
      get().applyMessage(toTableQueryMessage(entity));
    },

    reset: () => {
      batcher.flushNow();
      set({ tableData: tableDataInitialState, revision: 0 });
    },
  }))
);

export const enqueueTableDataMessage = (message: TableWSMessage): void => {
  if (message.action === 'query') {
    useTableDataStore.getState().applyMessage(message);
    return;
  }
  batcher.push(message);
};

export const enqueueTableDataMessageSafe = (
  message: unknown
): message is TableWSMessage => {
  if (!isTableWSMessage(message)) {
    return false;
  }
  enqueueTableDataMessage(message);
  return true;
};

export const selectTableEntity =
  <K extends keyof TableDataState>(entity: K) =>
  (state: TableDataStoreState): TableDataState[K] =>
    state.tableData[entity];

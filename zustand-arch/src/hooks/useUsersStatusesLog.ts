/**
 * - purpose: legacy-compatible API of UsersStatusesLogProvider's useUsersStatusesLog
 * - inputs: none
 * - outputs: { data: ILogUserStatus[]; dispatch: (msg: ReceivedWebSocketMessage) => void }
 * - constraint: signature identical to legacy provider
 * - removal: drop in favour of selectors after migration step 2
 */

import { useCallback } from 'react';

import type { ILogUserStatus } from '../../../src/shared/db-types';
import { useUsersStatusesList } from '../selectors/usersStatusesLog.selectors';
import { useUsersStatusesLogStore } from '../stores/usersStatusesLogStore';
import type { ReceivedWebSocketMessage } from '../types/ws';

const isLogArray = (value: unknown): value is ILogUserStatus[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && 'id' in item);

const isLog = (value: unknown): value is ILogUserStatus =>
  typeof value === 'object' && value !== null && 'id' in value && 'operator_id' in value;

const adaptMessage = (msg: ReceivedWebSocketMessage): void => {
  const { upsertBatch, remove } = useUsersStatusesLogStore.getState();
  switch (msg.action) {
    case 'bulkPut':
    case 'bulkAdd': {
      if (isLogArray(msg.payload)) upsertBatch(msg.payload);
      return;
    }
    case 'put':
    case 'add': {
      if (isLog(msg.payload)) upsertBatch([msg.payload]);
      return;
    }
    case 'delete': {
      if (typeof msg.payload === 'number') remove(msg.payload);
      return;
    }
    default:
      return;
  }
};

export const useUsersStatusesLog = (): {
  data: readonly ILogUserStatus[];
  dispatch: (msg: ReceivedWebSocketMessage) => void;
} => {
  const data = useUsersStatusesList();
  const dispatch = useCallback((msg: ReceivedWebSocketMessage) => adaptMessage(msg), []);
  return { data, dispatch };
};

/**
 * - purpose: legacy-compatible API of CallsStatisticsProvider's useCallsStatistics
 * - inputs: none
 * - outputs: { data: CallsStatistics[]; dispatch: (msg: ReceivedWebSocketMessage) => void }
 * - constraint: signature identical to src/app/providers/CallsStatisticsProvider
 * - removal: drop in favour of selectors after migration step 2
 */

import { useCallback } from 'react';

import type { CallsStatistics } from '../../../src/shared/db-types';
import { useCallsStatisticsList } from '../selectors/callsStatistics.selectors';
import { useCallsStatisticsStore } from '../stores/callsStatisticsStore';
import type { ReceivedWebSocketMessage } from '../types/ws';

const isCallsStatisticsArray = (value: unknown): value is CallsStatistics[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && 'id' in item);

const isCallsStatistics = (value: unknown): value is CallsStatistics =>
  typeof value === 'object' && value !== null && 'id' in value && 'queue_id' in value;

const adaptMessage = (msg: ReceivedWebSocketMessage): void => {
  const { upsertBatch, remove } = useCallsStatisticsStore.getState();
  switch (msg.action) {
    case 'bulkPut':
    case 'bulkAdd': {
      if (isCallsStatisticsArray(msg.payload)) upsertBatch(msg.payload);
      return;
    }
    case 'put':
    case 'add': {
      if (isCallsStatistics(msg.payload)) upsertBatch([msg.payload]);
      return;
    }
    case 'delete': {
      if (typeof msg.payload === 'string') remove(msg.payload);
      return;
    }
    default:
      return;
  }
};

export const useCallsStatistics = (): {
  data: readonly CallsStatistics[];
  dispatch: (msg: ReceivedWebSocketMessage) => void;
} => {
  const data = useCallsStatisticsList();
  const dispatch = useCallback((msg: ReceivedWebSocketMessage) => adaptMessage(msg), []);
  return { data, dispatch };
};

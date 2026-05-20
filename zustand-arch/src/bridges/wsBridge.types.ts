/**
 * - purpose: typed shapes the wsBridge expects to receive from the worker
 * - inputs: none
 * - outputs: HotPathBuffer + payload narrowing helpers
 * - source: src/app/workers/types/WorkerMessage + WS payload types
 * - boundary: only contract between bridge and worker
 */

import type { CallsStatistics, ILogUserStatus } from '../../../src/shared/db-types';
import type { TableWSMessage } from '../types/tables';
import type {
  ProxyResponseMessage,
  ReceivedWebSocketMessage,
} from '../types/ws';

export interface HotPathBuffer {
  callsStatistics: CallsStatistics[];
  usersStatusesLog: ILogUserStatus[];
  table: TableWSMessage[];
}

export const createEmptyBuffer = (): HotPathBuffer => ({
  callsStatistics: [],
  usersStatusesLog: [],
  table: [],
});

export interface CallsStatisticsHotMessage {
  type: 'CALLS_STATISTICS';
  data: ReceivedWebSocketMessage;
}

export interface UsersStatusesLogHotMessage {
  type: 'USERS_STATUSES_LOG';
  data: ReceivedWebSocketMessage;
}

export interface TableHotMessage {
  type: 'TABLE_DATA_MESSAGE';
  data: TableWSMessage;
}

export type ProxyMessage = { type: 'PROXY_REST_API'; data: ProxyResponseMessage };

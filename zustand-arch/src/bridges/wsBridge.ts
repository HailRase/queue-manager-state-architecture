/**
 * - purpose: route worker messages to stores, batching hot-path at 100ms
 * - inputs: optional Worker (DI for tests); creates wsWorker by default
 * - outputs: teardown function disposing batcher + worker
 * - constraint: NO React imports; pure module; one shared 100ms batcher
 * - boundary: only place that knows worker message protocol
 */

import { db } from '../../../src/app/db';
import type { CallsStatistics, ILogUserStatus, QueryID } from '../../../src/shared/db-types';
import { useCallsStatisticsStore } from '../stores/callsStatisticsStore';
import { useNotificationsStore } from '../stores/notificationsStore';
import { useTableDataStore } from '../stores/tableDataStore';
import { useUsersStatusesLogStore } from '../stores/usersStatusesLogStore';
import { useWsStore } from '../stores/wsStore';
import type { INotification, ISOSNotification } from '../types/notifications';
import type { TableWSMessage } from '../types/tables';
import type {
  ProxyResponseMessage,
  ReceivedWebSocketMessage,
  WebSocketMessage,
} from '../types/ws';
import { createBatcher } from '../utils/createBatcher';
import { createEmptyBuffer, type HotPathBuffer } from './wsBridge.types';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const HOT_PATH_FLUSH_MS = 100;

const createWorker = (): Worker =>
  new Worker(
    new URL('../../../src/app/workers/wsWorker.ts', import.meta.url),
    { type: 'module' }
  );

const filterCallsStatistics24h = (
  items: readonly CallsStatistics[]
): CallsStatistics[] => {
  const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
  return items.filter((item) => item.ts_start >= cutoff);
};

const isCallsStatisticsArray = (value: unknown): value is CallsStatistics[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && 'ts_start' in item);

const isLogUserStatusArray = (value: unknown): value is ILogUserStatus[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && 'id' in item);

const handleCallsStatistics = (
  buffer: HotPathBuffer,
  schedule: () => void,
  msg: ReceivedWebSocketMessage
): void => {
  if (msg.action === 'bulkPut' && isCallsStatisticsArray(msg.payload)) {
    const filtered = filterCallsStatistics24h(msg.payload);
    if (filtered.length === 0) return;
    buffer.callsStatistics.push(...filtered);
    schedule();
    return;
  }
  if ((msg.action === 'put' || msg.action === 'add') && !Array.isArray(msg.payload)) {
    const item = msg.payload as CallsStatistics;
    if (item.ts_start >= Date.now() - TWENTY_FOUR_HOURS_MS) {
      buffer.callsStatistics.push(item);
      schedule();
    }
    return;
  }
  if (msg.action === 'delete' && typeof msg.payload === 'string') {
    useCallsStatisticsStore.getState().remove(msg.payload);
  }
};

const handleUsersStatusesLog = (
  buffer: HotPathBuffer,
  schedule: () => void,
  msg: ReceivedWebSocketMessage
): void => {
  if (msg.action === 'bulkPut' && isLogUserStatusArray(msg.payload)) {
    buffer.usersStatusesLog.push(...msg.payload);
    schedule();
    return;
  }
  if ((msg.action === 'put' || msg.action === 'add') && !Array.isArray(msg.payload)) {
    buffer.usersStatusesLog.push(msg.payload as ILogUserStatus);
    schedule();
    return;
  }
  if (msg.action === 'delete' && typeof msg.payload === 'number') {
    useUsersStatusesLogStore.getState().remove(msg.payload);
  }
};

const flushBuffer = (buffer: HotPathBuffer): void => {
  if (buffer.callsStatistics.length > 0) {
    useCallsStatisticsStore.getState().upsertBatch(buffer.callsStatistics);
    buffer.callsStatistics = [];
  }
  if (buffer.usersStatusesLog.length > 0) {
    useUsersStatusesLogStore.getState().upsertBatch(buffer.usersStatusesLog);
    buffer.usersStatusesLog = [];
  }
  if (buffer.table.length > 0) {
    const apply = useTableDataStore.getState().applyMessage;
    for (const m of buffer.table) apply(m);
    buffer.table = [];
  }
};

const handleProxyResponse = (data: ProxyResponseMessage): void => {
  const { id, status } = data;
  const isSuccess = status >= 200 && status < 300;
  if (isSuccess) {
    useWsStore.getState().resolvePending(id, data.body);
  } else {
    useWsStore.getState().rejectPending(id, data);
  }
};

const handleWorkerMessage = (
  msg: WebSocketMessage,
  buffer: HotPathBuffer,
  schedule: () => void
): void => {
  switch (msg.type) {
    case 'OPEN':
      useWsStore.getState().setStatus({ status: 'Open', maxAttemptsReconnectReached: false });
      return;
    case 'CLOSE':
    case 'ERROR':
      useWsStore.getState().setStatus({ status: 'Closed' });
      return;
    case 'MAX_RECONNECTS_REACHED':
      useWsStore.getState().setStatus({ maxAttemptsReconnectReached: true });
      return;
    case 'NOTIFY':
      useNotificationsStore.getState().push(msg.data as INotification);
      return;
    case 'SOS_NOTIFY':
      useNotificationsStore.getState().pushSos(msg.data as ISOSNotification);
      return;
    case 'QUERY_ID_ACK':
      void db.query_id.put(msg.data as QueryID);
      return;
    case 'CALLS_STATISTICS':
      handleCallsStatistics(buffer, schedule, msg.data as ReceivedWebSocketMessage);
      return;
    case 'USERS_STATUSES_LOG':
      handleUsersStatusesLog(buffer, schedule, msg.data as ReceivedWebSocketMessage);
      return;
    case 'TABLE_DATA_MESSAGE':
      buffer.table.push(msg.data as TableWSMessage);
      schedule();
      return;
    case 'PROXY_REST_API':
      handleProxyResponse(msg.data as ProxyResponseMessage);
      return;
    default:
      return;
  }
};

export const initWsBridge = (worker?: Worker): (() => void) => {
  const w = worker ?? createWorker();
  const buffer = createEmptyBuffer();
  const batcher = createBatcher<void>(() => flushBuffer(buffer), HOT_PATH_FLUSH_MS);
  const schedule = (): void => batcher.push(undefined);

  useWsStore.getState().setWorker(w);

  const onMessage = (event: MessageEvent<WebSocketMessage>): void => {
    handleWorkerMessage(event.data, buffer, schedule);
  };

  w.addEventListener('message', onMessage);

  return () => {
    w.removeEventListener('message', onMessage);
    batcher.dispose();
    useWsStore.getState().setWorker(null);
    if (!worker) w.terminate();
  };
};

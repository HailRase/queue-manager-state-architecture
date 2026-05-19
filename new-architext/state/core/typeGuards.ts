import { TableWSMessage } from 'app/providers/TableDataProvider/model/types';
import { WebSocketMessage } from 'app/workers/types';
import { ReceivedWebSocketMessage } from 'app/workers/types';
import { WebSocketActions } from 'app/workers/types/WebSocketActions';
import { ENTITY_NAMES } from 'constants/settings';
import { CallsStatistics, ILogUserStatus, QueryID } from 'shared/db-types';
import {
  INotification,
  ISOSNotification,
} from 'widgets/Notification/model/Notification.interfaces';

import {
  CallsStatisticsWsMessage,
  UsersStatusesLogWsMessage,
} from './streamEntityTypes';
import { ProxyRestApiResponse } from './types';
import { isTableEntityKey, TABLE_ENTITY_KEYS } from './tableDataHelpers';
import { WorkerBridgeMessage } from './workerBridgeTypes';

const WS_ACTION_SET: ReadonlySet<string> = new Set<WebSocketActions>([
  'put',
  'add',
  'bulkPut',
  'bulkAdd',
  'delete',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasString = (obj: Record<string, unknown>, key: string): boolean =>
  typeof obj[key] === 'string';

const hasNumber = (obj: Record<string, unknown>, key: string): boolean =>
  typeof obj[key] === 'number';

const hasBoolean = (obj: Record<string, unknown>, key: string): boolean =>
  typeof obj[key] === 'boolean';

export const isWebSocketAction = (value: unknown): value is WebSocketActions =>
  typeof value === 'string' && WS_ACTION_SET.has(value);

export { isTableEntityKey, TABLE_ENTITY_KEYS };

export const isQueryId = (value: unknown): value is QueryID =>
  isRecord(value) && hasString(value, 'id');

export const isINotification = (value: unknown): value is INotification =>
  isRecord(value) &&
  hasString(value, 'id') &&
  hasString(value, 'body') &&
  hasNumber(value, 'time') &&
  hasBoolean(value, 'blocked') &&
  hasBoolean(value, 'deleted') &&
  hasString(value, 'position');

export const isISOSNotification = (value: unknown): value is ISOSNotification =>
  isRecord(value) &&
  hasNumber(value, 'id') &&
  hasNumber(value, 'operator') &&
  hasNumber(value, 'supervisor');

export const isProxyRestApiResponse = (
  value: unknown
): value is ProxyRestApiResponse =>
  isRecord(value) &&
  hasString(value, 'id') &&
  hasString(value, 'path') &&
  hasNumber(value, 'status') &&
  isRecord(value.headers);

export const isCallsStatistics = (value: unknown): value is CallsStatistics =>
  isRecord(value) &&
  hasString(value, 'id') &&
  hasNumber(value, 'ts_start') &&
  hasString(value, 'call_type') &&
  hasString(value, 'status');

export const isCallsStatisticsArray = (
  value: unknown
): value is CallsStatistics[] =>
  Array.isArray(value) && value.every(isCallsStatistics);

export const isLogUserStatus = (value: unknown): value is ILogUserStatus =>
  isRecord(value) &&
  hasNumber(value, 'id') &&
  hasString(value, 'datetime') &&
  hasNumber(value, 'status') &&
  hasNumber(value, 'operator_id');

export const isLogUserStatusArray = (value: unknown): value is ILogUserStatus[] =>
  Array.isArray(value) && value.every(isLogUserStatus);

const isEntityMapShape = (
  value: unknown
): value is ReceivedWebSocketMessage & { entity: string; action: WebSocketActions } => {
  if (!isRecord(value)) return false;
  if (!hasString(value, 'entity')) return false;
  if (!isWebSocketAction(value.action)) return false;
  return 'payload' in value;
};

export const isCallsStatisticsWsMessage = (
  value: unknown
): value is CallsStatisticsWsMessage => {
  if (!isEntityMapShape(value)) return false;
  if (value.entity !== ENTITY_NAMES.CALLS_STATISTICS) return false;

  switch (value.action) {
    case 'put':
    case 'add':
      return isCallsStatistics(value.payload);
    case 'delete':
      return typeof value.payload === 'string' || typeof value.payload === 'number';
    case 'bulkPut':
    case 'bulkAdd':
      return isCallsStatisticsArray(value.payload);
    default:
      return false;
  }
};

export const isUsersStatusesLogWsMessage = (
  value: unknown
): value is UsersStatusesLogWsMessage => {
  if (!isEntityMapShape(value)) return false;
  if (value.entity !== ENTITY_NAMES.USERS_STATUSES_LOG) return false;

  switch (value.action) {
    case 'put':
    case 'add':
      return isLogUserStatus(value.payload);
    case 'delete':
      return typeof value.payload === 'string' || typeof value.payload === 'number';
    case 'bulkPut':
    case 'bulkAdd':
      return isLogUserStatusArray(value.payload);
    default:
      return false;
  }
};

const isTableWsShape = (
  value: unknown
): value is Record<string, unknown> & { entity: string; action: string } => {
  if (!isRecord(value)) return false;
  return hasString(value, 'entity') && hasString(value, 'action');
};

export const isTableWSMessage = (value: unknown): value is TableWSMessage => {
  if (!isTableWsShape(value)) return false;
  if (!isTableEntityKey(value.entity)) return false;

  switch (value.action) {
    case 'query':
      return !('payload' in value) || value.payload === undefined;
    case 'delete':
      return (
        typeof value.payload === 'string' || typeof value.payload === 'number'
      );
    case 'bulkPut': {
      if (!isRecord(value.payload)) return false;
      const payload = value.payload;
      return (
        Array.isArray(payload.items) &&
        hasNumber(payload, 'page') &&
        hasNumber(payload, 'pages') &&
        hasNumber(payload, 'size') &&
        hasNumber(payload, 'total')
      );
    }
    case 'put':
    case 'add':
      return isRecord(value.payload) && hasString(value.payload, 'id');
    default:
      return false;
  }
};

export const parseWorkerBridgeMessage = (
  message: WebSocketMessage
): WorkerBridgeMessage | null => {
  switch (message.type) {
    case 'OPEN':
    case 'CLOSE':
    case 'MAX_RECONNECTS_REACHED':
      return { type: message.type };
    case 'ERROR':
      return message.data instanceof Event
        ? { type: 'ERROR', data: message.data }
        : null;
    case 'NOTIFY':
      return isINotification(message.data)
        ? { type: 'NOTIFY', data: message.data }
        : null;
    case 'SOS_NOTIFY':
      return isISOSNotification(message.data)
        ? { type: 'SOS_NOTIFY', data: message.data }
        : null;
    case 'QUERY_ID_ACK':
      return isQueryId(message.data)
        ? { type: 'QUERY_ID_ACK', data: message.data }
        : null;
    case 'TABLE_DATA_MESSAGE': {
      if (!isTableWSMessage(message.data)) return null;
      const parsed: WorkerBridgeMessage = {
        type: 'TABLE_DATA_MESSAGE',
        data: message.data,
      };
      return parsed;
    }
    case 'CALLS_STATISTICS': {
      if (!isCallsStatisticsWsMessage(message.data)) return null;
      const parsed: WorkerBridgeMessage = {
        type: 'CALLS_STATISTICS',
        data: message.data,
      };
      return parsed;
    }
    case 'USERS_STATUSES_LOG': {
      if (!isUsersStatusesLogWsMessage(message.data)) return null;
      const parsed: WorkerBridgeMessage = {
        type: 'USERS_STATUSES_LOG',
        data: message.data,
      };
      return parsed;
    }
    case 'PROXY_REST_API':
      return isProxyRestApiResponse(message.data)
        ? { type: 'PROXY_REST_API', data: message.data }
        : null;
    default:
      return null;
  }
};

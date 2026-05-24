/* eslint-disable max-lines */
import { db } from 'app/db';
import {
  ReceivedWSPaginatedPayload,
  WebSocketMessage,
} from 'app/workers/types';
import { UserIdSchema as User } from 'shared/api-types';
import { CallsStatistics, ReceivedWSPayload } from 'shared/db-types';
import { EntityName } from 'types/settings';

import { normalizePayload } from './normalizePayload';
import { ReceivedPayload, ReceivedWebSocketMessage } from './types';
import { WebSocketActions } from './types/WebSocketActions';
import { normalizeUserStatus } from './utils/normalizeUserStatus';

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 12;
let isReconnecting = false;
let maxReconnectsReached = false;
let updateCacheInterval: number;

let cache = {};

const broadcastMessage = (message: WebSocketMessage) => {
  self.postMessage(message);
};
const updateCacheData = (
  entity: EntityName,
  action: WebSocketActions,
  payload: ReceivedWSPayload | ReceivedWSPaginatedPayload
) => {
  if (action === 'put' || action === 'add') {
    const entityPrimaryKey = db[entity].schema.primKey.name;
    if (entityPrimaryKey in payload) {
      cache[entity].data[payload[entityPrimaryKey]] = payload;
    }
  } else if (
    (Array.isArray(payload) && action === 'bulkPut') ||
    (Array.isArray(payload) && action === 'bulkAdd')
  ) {
    const entityPrimaryKey = db[entity].schema.primKey.name;
    payload.forEach((item) => {
      if (entityPrimaryKey in item) {
        cache[entity].data[item[entityPrimaryKey]] = item;
      }
    });
  } else {
    db[entity]?.[action](payload);
  }
};
const updateCache = (
  entity: EntityName,
  action: WebSocketActions,
  payload: ReceivedWSPayload | ReceivedWSPaginatedPayload
) => {
  if (cache[entity]) {
    updateCacheData(entity, action, payload);
  } else {
    cache[entity] = { data: {} };
    updateCacheData(entity, action, payload);
  }
};

const connectWebSocket = (url: string) => {
  const reconnect = (_url: string) => {
    if (isReconnecting || maxReconnectsReached) return;
    isReconnecting = true;
    reconnectAttempts++;

    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      maxReconnectsReached = true;
      broadcastMessage({ type: 'MAX_RECONNECTS_REACHED' });
      return;
    }
    setTimeout(() => connectWebSocket(url), 5000);
  };

  ws = new WebSocket(url);

  ws.onopen = () => {
    reconnectAttempts = 0;
    maxReconnectsReached = false;
    isReconnecting = false;
    updateCacheInterval = setInterval(async () => {
      const isCacheEmpty = Object.getOwnPropertyNames(cache).length === 0;
      if (isCacheEmpty) return;

      const entities = Object.keys(cache);
      // const totalStart = performance.now();
      // const stats: { entity: string; count: number; timeMs: number }[] = [];

      const cacheToFlush = cache;
      cache = {};

      for (const entity of entities) {
        const items = Object.values(cacheToFlush[entity]?.data || {});
        if (items.length === 0) continue;

        // const entityStart = performance.now();
        try {
          await db[entity]?.bulkPut(items);
          // const duration = performance.now() - entityStart;
          // stats.push({
          //   entity,
          //   count: items.length,
          //   timeMs: +duration.toFixed(2),
          // });
          // console.log(
          //   `[Flush] ${entity}: ${items.length} records in ${duration.toFixed(
          //     2
          //   )}ms`
          // );
        } catch (err) {
          // console.error(
          //   `[Flush] ${entity} FAILED after ${(
          //     performance.now() - entityStart
          //   ).toFixed(2)}ms`,
          //   err
          // );
          Object.assign(cache, { [entity]: cacheToFlush[entity] });
        }
      }

      // const totalDuration = performance.now() - totalStart;
      // console.log(
      //   `[Flush] Total: ${totalDuration.toFixed(2)}ms for ${stats.reduce(
      //     (s, i) => s + i.count,
      //     0
      //   )} records`
      // );
      // if (stats.length > 0) console.table(stats);
    }, 150);
    // const runStatCleaner = async () => {
    //   try {
    //     const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    //     await db.calls_statistics.where('ts_start').below(cutoff).delete();
    //   } finally {
    //     setTimeout(runStatCleaner, 60 * 1000);
    //   }
    // };
    // runStatCleaner();
    console.log('ws connected');
    broadcastMessage({ type: 'OPEN' });
  };

  ws.onclose = () => {
    console.log('ws closed');
    clearInterval(updateCacheInterval);
    broadcastMessage({ type: 'CLOSE' });
    reconnect(url);
  };
  ws.onerror = (e) => {
    isReconnecting = false;
    broadcastMessage({ type: 'ERROR', data: e });
    broadcastMessage({ type: 'CLOSE' });
    reconnect(url);
  };

  ws.onmessage = (event: MessageEvent) => {
    const msg = JSON.parse(event.data) as ReceivedWebSocketMessage;

    if ('action' in msg && msg?.entity && msg?.action && msg?.payload) {
      switch (msg.entity) {
        case 'rotator':
          broadcastMessage({ type: 'PROXY_REST_API', data: msg.payload });
          break;
        case 'notification_sos':
          broadcastMessage({ type: 'SOS_NOTIFY', data: msg.payload });
          updateCache(msg.entity, msg.action, msg.payload);
          break;
        case 'calls_statistics':
          if (msg.action === 'bulkPut') {
            const now = Date.now();
            const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
            const filteredCallStatistics = (
              msg.payload as CallsStatistics[]
            ).filter((call) => {
              return call.ts_start >= twentyFourHoursAgo;
            });
            broadcastMessage({
              type: 'CALLS_STATISTICS',
              data: { ...msg, payload: filteredCallStatistics },
            });
          } else {
            broadcastMessage({
              type: 'CALLS_STATISTICS',
              data: msg,
            });
          }
          break;
        case 'users_statuses_log': {
          broadcastMessage({
            type: 'USERS_STATUSES_LOG',
            data: msg,
          });
          break;
        }
        case 'notification':
          broadcastMessage({ type: 'NOTIFY', data: msg.payload });
          updateCache(msg.entity, msg.action, msg.payload);
          break;
        case 'query_id':
          broadcastMessage({ type: 'QUERY_ID_ACK', data: msg.payload });
          break;
        case 'organization_structure':
          db.notification.clear();
          const payload = normalizePayload(msg.payload) as ReceivedPayload;
          updateCache(msg.entity, msg.action, payload);
          break;
        case 'abonent':
          db.abonent.clear();
          updateCache(msg.entity, msg.action, msg.payload);
          break;
        case 'company_runtime':
          if (msg.action === 'delete') {
            db.company_runtime.delete(
              (msg.payload as { company_id: string }).company_id
            );
          } else {
            updateCache(msg.entity, msg.action, msg.payload);
          }
          break;
        case 'calls':
        case 'operator_status_history':
          broadcastMessage({ type: 'TABLE_DATA_MESSAGE', data: msg });
          break;
        case 'users':
          const isWriteAction = ['put', 'bulkPut', 'add'].includes(msg.action);
          let normalizedUsersPayload = msg.payload;
          if (isWriteAction) {
            normalizedUsersPayload = Array.isArray(msg.payload)
              ? msg.payload.map((user) => normalizeUserStatus(user as User))
              : normalizeUserStatus(msg.payload as User);
          }
          updateCache(msg.entity, msg.action, normalizedUsersPayload);
          break;
        default:
          updateCache(msg.entity, msg.action, msg.payload);
          break;
      }
    } else if (msg !== null) {
      console.error('Unknown WS message', msg);
    }
  };
};

self.onmessage = (event: MessageEvent<WebSocketMessage>) => {
  const { type, data } = event.data;
  switch (type) {
    case 'CONNECT':
      data && connectWebSocket(data as string);
      break;
    case 'DISCONNECT':
      self.close();
      console.log('ws disconnect');
      ws?.close();
      break;
    case 'SEND':
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
      break;
  }
};
export {};

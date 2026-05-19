import { db } from 'app/db';
import { WebSocketMessage } from 'app/workers/types';
import { dispatchNotify, dispatchSosNotify } from 'utils';
import { wsOnCloseHandler, wsOnOpenHandler } from 'utils/wsEventHandlers';

import { parseWorkerBridgeMessage } from '../core/typeGuards';
import { WorkerBridgeMessage } from '../core/workerBridgeTypes';
import {
  enqueueCallsStatisticsMessage,
} from '../stores/callsStatisticsStore';
import { enqueueTableDataMessage } from '../stores/tableDataStore';
import { enqueueUsersStatusesLogMessage } from '../stores/usersStatusesLogStore';
import { useWsStore } from '../stores/wsStore';

const handleWorkerBridgeMessage = (message: WorkerBridgeMessage): void => {
  switch (message.type) {
    case 'OPEN': {
      const ws = useWsStore.getState();
      ws.setStatus('Open');
      ws.setMaxReconnectsReached(false);
      wsOnOpenHandler();
      return;
    }
    case 'CLOSE': {
      useWsStore.getState().setStatus('Closed');
      wsOnCloseHandler();
      return;
    }
    case 'ERROR':
      return;
    case 'MAX_RECONNECTS_REACHED':
      useWsStore.getState().setMaxReconnectsReached(true);
      return;
    case 'NOTIFY':
      dispatchNotify(message.data);
      return;
    case 'SOS_NOTIFY':
      dispatchSosNotify(message.data);
      return;
    case 'QUERY_ID_ACK':
      void db.query_id.put(message.data);
      return;
    case 'TABLE_DATA_MESSAGE':
      enqueueTableDataMessage(message.data);
      return;
    case 'CALLS_STATISTICS':
      enqueueCallsStatisticsMessage(message.data);
      return;
    case 'USERS_STATUSES_LOG':
      enqueueUsersStatusesLogMessage(message.data);
      return;
    case 'PROXY_REST_API':
      useWsStore.getState().resolvePending(message.data);
      return;
    default: {
      const _exhaustive: never = message;
      return _exhaustive;
    }
  }
};

/**
 * Central WS worker → app router.
 * Immediate handlers must stay synchronous and lightweight.
 * Hot streams are batched inside their stores (100+ msg/s).
 */
export function routeWorkerMessage(event: MessageEvent<WebSocketMessage>): void {
  const parsed = parseWorkerBridgeMessage(event.data);
  if (!parsed) {
    if (import.meta.env.DEV) {
      console.warn('[routeWorkerMessage] Dropped invalid worker message', event.data);
    }
    return;
  }
  handleWorkerBridgeMessage(parsed);
}

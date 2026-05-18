import { db } from 'app/db';
import {
  useCallsStatistics,
  useTableDataContext,
  useUsersStatusesLog,
} from 'app/providers';
import { TableWSMessage } from 'app/providers/TableDataProvider/model/types';
import { ReceivedWebSocketMessage, WebSocketMessage } from 'app/workers/types';
import WSWorker from 'app/workers/wsWorker?worker';
import { COMMAND_NAMES, WS_API_URL } from 'constants/api';
import { ENTITY_NAMES } from 'constants/settings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QueryID } from 'shared/db-types';
import { Payload } from 'types';
import { CommandName } from 'types/api';
import { EntityName } from 'types/settings';
import { dispatchNotify, dispatchSosNotify } from 'utils';
import { generateUuid } from 'utils/generateUuid';
import { wsOnCloseHandler, wsOnOpenHandler } from 'utils/wsEventHandlers';
import {
  INotification,
  ISOSNotification,
} from 'widgets/Notification/model/Notification.interfaces';

export interface ProxyRestApiMessage {
  id: string;
  method: string;
  path: string;
  body: unknown;
}
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}
interface ResponseMessage {
  id: string;
  path: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export const useWSWorker = (): {
  maxAttemptsReconnectReached: boolean;
  command: (command: CommandName, entity: EntityName, payload: Payload) => void;
  status: string;
  connect: () => void;
  sendRestApiMessage: (
    command: CommandName,
    entity: EntityName,
    msg: Omit<ProxyRestApiMessage, 'id'>
  ) => Promise<unknown>;
  sendRotatorMessage: (
    msg: Omit<ProxyRestApiMessage, 'id'>
  ) => Promise<unknown>;
} => {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [wsState, setWSState] = useState({
    status: 'Init',
    maxAttemptsReconnectReached: false,
  });
  const { dispatch } = useTableDataContext();
  const { dispatch: callsDispatch } = useCallsStatistics();
  const { dispatch: statusDispatch } = useUsersStatusesLog();
  const pendingRequestsRef = useRef<Map<string, PendingRequest>>(new Map());

  const connectWS = useCallback(() => {
    if (worker) {
      worker.postMessage({ type: 'CONNECT', data: WS_API_URL });
    }
  }, [worker]);

  useEffect(() => {
    const wsWorker = new WSWorker();
    setWorker(wsWorker);
    wsWorker.onmessage = (event: MessageEvent<WebSocketMessage>) => {
      const { type, data } = event.data;
      switch (type) {
        case 'OPEN':
          setWSState((prevState) => ({
            ...prevState,
            status: 'Open',
            maxAttemptsReconnectReached: false,
          }));
          window.addEventListener('beforeunload', () => {
            wsWorker.postMessage({ type: 'DISCONNECT' });
          });
          wsOnOpenHandler();
          break;
        case 'CLOSE':
          setWSState((prevState) => ({ ...prevState, status: 'Closed' }));
          wsOnCloseHandler();
          break;
        case 'NOTIFY':
          dispatchNotify(data as INotification);
          break;
        case 'SOS_NOTIFY':
          dispatchSosNotify(data as ISOSNotification);
          break;
        case 'MAX_RECONNECTS_REACHED':
          setWSState((prevState) => ({
            ...prevState,
            maxAttemptsReconnectReached: true,
          }));
          break;
        case 'QUERY_ID_ACK':
          db.query_id.put(data as QueryID);
          break;
        case 'TABLE_DATA_MESSAGE':
          dispatch(data as TableWSMessage);
          break;
        case 'CALLS_STATISTICS':
          callsDispatch(data as ReceivedWebSocketMessage);
          break;
        case 'USERS_STATUSES_LOG':
          statusDispatch(data as ReceivedWebSocketMessage);
          break;
        case 'PROXY_REST_API': {
          const { id, status, body } = data as ResponseMessage;
          const pending = pendingRequestsRef.current.get(id);
          if (pending) {
            if (status >= 200 && status < 300) {
              pending.resolve(body);
            } else {
              pending.reject(data);
            }
            pendingRequestsRef.current.delete(id);
          }
          break;
        }
        default:
          break;
      }
    };
  }, [callsDispatch, dispatch, statusDispatch]);
  useEffect(() => {
    if (worker) {
      worker.postMessage({ type: 'CONNECT', data: WS_API_URL });
    }
  }, [worker]);

  const sendMessage = useCallback(
    (command: CommandName, entity: EntityName, payload: Payload) => {
      const type = `${command}_${entity}`;
      worker?.postMessage({
        type: 'SEND',
        data: { command, entity, type, payload },
      });
    },
    [worker]
  );

  const sendRestApiMessage = useCallback(
    (
      command: CommandName,
      entity: EntityName,
      msg: Omit<ProxyRestApiMessage, 'id'>
    ): Promise<unknown> => {
      if (!worker) return Promise.reject('Worker не инициализирован');
      const type = `${command}_${entity}`;
      const id = generateUuid();
      const payload = { id, ...msg };
      return new Promise((resolve, reject) => {
        pendingRequestsRef.current.set(id, { resolve, reject });
        worker.postMessage({
          type: 'SEND',
          data: { command, entity, type, payload },
        });
      });
    },
    [worker]
  );

  const sendRotatorMessage = useCallback(
    (msg: Omit<ProxyRestApiMessage, 'id'>) =>
      sendRestApiMessage(COMMAND_NAMES.PROXY, ENTITY_NAMES.ROTATOR, msg),
    [sendRestApiMessage]
  );

  return {
    maxAttemptsReconnectReached: wsState.maxAttemptsReconnectReached,
    command: sendMessage,
    sendRestApiMessage,
    sendRotatorMessage,
    status: wsState.status,
    connect: connectWS,
  };
};

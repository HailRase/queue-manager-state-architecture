import WSWorker from 'app/workers/wsWorker?worker';
import { COMMAND_NAMES, WS_API_URL } from 'constants/api';
import { ENTITY_NAMES } from 'constants/settings';
import { FC, ReactNode, useEffect } from 'react';
import { Payload } from 'types/db';
import { CommandName } from 'types/api';
import { EntityName } from 'types/settings';
import { generateUuid } from 'utils/generateUuid';

import { ProxyRestApiMessage } from '../core/types';
import { buildWsOutbound, sendRestViaStore, useWsStore } from '../stores/wsStore';
import { routeWorkerMessage } from './routeWorkerMessage';

interface WsBridgeProps {
  children: ReactNode;
}

/**
 * Single mount point for WS worker. Replaces WebSocketProvider + nested reducers.
 * Does NOT touch Dexie entity sync (still in wsWorker).
 */
export const WsBridge: FC<WsBridgeProps> = ({ children }) => {
  useEffect(() => {
    const worker = new WSWorker();
    useWsStore.getState().setWorker(worker);

    worker.onmessage = routeWorkerMessage;

    const onBeforeUnload = (): void => {
      worker.postMessage({ type: 'DISCONNECT' });
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    useWsStore.getState().connect(WS_API_URL);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      worker.postMessage({ type: 'DISCONNECT' });
      worker.terminate();
      useWsStore.getState().setWorker(null);
    };
  }, []);

  return <>{children}</>;
};

export const wsCommand = (
  command: CommandName,
  entity: EntityName,
  payload: Payload
): void => {
  useWsStore.getState().postToWorker(buildWsOutbound(command, entity, payload));
};

export const wsConnect = (): void => {
  useWsStore.getState().connect(WS_API_URL);
};

export const wsSendRestApiMessage = <TResponse = unknown>(
  command: CommandName,
  entity: EntityName,
  msg: Omit<ProxyRestApiMessage, 'id'>
): Promise<TResponse> =>
  sendRestViaStore<TResponse>(command, entity, msg, generateUuid);

export const wsSendRotatorMessage = <TResponse = unknown>(
  msg: Omit<ProxyRestApiMessage, 'id'>
): Promise<TResponse> =>
  wsSendRestApiMessage<TResponse>(COMMAND_NAMES.PROXY, ENTITY_NAMES.ROTATOR, msg);

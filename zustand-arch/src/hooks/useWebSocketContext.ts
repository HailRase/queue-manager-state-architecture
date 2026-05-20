/**
 * - purpose: legacy-compatible API of WebSocketProvider's useWebSocketContext
 * - inputs: none
 * - outputs: { status, setWsConnect, maxAttemptsReconnectReached, command, sendRestApiMessage, sendRotatorMessage }
 * - constraint: signature identical to src/app/providers/WebSocketProvider
 * - removal: replace consumers with ws.selectors hooks after migration step 1
 */

import { useCallback } from 'react';

import { WS_API_URL } from '../../../src/constants/api';
import { useWsStore } from '../stores/wsStore';
import type {
  CommandName,
  EntityName,
  Payload,
  ProxyRestApiMessage,
  WsStatus,
} from '../types/ws';

export const useWebSocketContext = (): {
  status: WsStatus;
  setWsConnect: () => void;
  maxAttemptsReconnectReached: boolean;
  command: (cmd: CommandName, entity: EntityName, payload: Payload) => void;
  sendRestApiMessage: (
    cmd: CommandName,
    entity: EntityName,
    msg: Omit<ProxyRestApiMessage, 'id'>
  ) => Promise<unknown>;
  sendRotatorMessage: (msg: Omit<ProxyRestApiMessage, 'id'>) => Promise<unknown>;
} => {
  const status = useWsStore((s) => s.status);
  const maxAttemptsReconnectReached = useWsStore((s) => s.maxAttemptsReconnectReached);
  const setWsConnect = useCallback(() => {
    useWsStore.getState().connect(WS_API_URL);
  }, []);
  const command = useCallback(
    (cmd: CommandName, entity: EntityName, payload: Payload) => {
      useWsStore.getState().command(cmd, entity, payload);
    },
    []
  );
  const sendRestApiMessage = useCallback(
    (cmd: CommandName, entity: EntityName, msg: Omit<ProxyRestApiMessage, 'id'>) =>
      useWsStore.getState().sendRestApiMessage(cmd, entity, msg),
    []
  );
  const sendRotatorMessage = useCallback(
    (msg: Omit<ProxyRestApiMessage, 'id'>) =>
      useWsStore.getState().sendRotatorMessage(msg),
    []
  );
  return {
    status,
    setWsConnect,
    maxAttemptsReconnectReached,
    command,
    sendRestApiMessage,
    sendRotatorMessage,
  };
};

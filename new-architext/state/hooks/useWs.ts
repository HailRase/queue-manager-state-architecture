import { useShallow } from 'zustand/react/shallow';

import {
  wsCommand,
  wsConnect,
  wsSendRestApiMessage,
  wsSendRotatorMessage,
} from '../bridge/WsBridge';
import { ProxyRestApiMessage } from '../core/types';
import { useWsStore } from '../stores/wsStore';
import { CommandName } from 'types/api';
import { EntityName } from 'types/settings';
import { Payload } from 'types/db';

export interface UseWsResult {
  status: string;
  maxAttemptsReconnectReached: boolean;
  setWsConnect: () => void;
  command: (command: CommandName, entity: EntityName, payload: Payload) => void;
  sendRestApiMessage: <TResponse = unknown>(
    command: CommandName,
    entity: EntityName,
    msg: Omit<ProxyRestApiMessage, 'id'>
  ) => Promise<TResponse>;
  sendRotatorMessage: <TResponse = unknown>(
    msg: Omit<ProxyRestApiMessage, 'id'>
  ) => Promise<TResponse>;
}

/**
 * API-compatible with app/providers/WebSocketProvider for incremental migration.
 */
export const useWs = (): UseWsResult => {
  const { status, maxReconnectsReached } = useWsStore(
    useShallow((s) => ({
      status: s.status,
      maxReconnectsReached: s.maxReconnectsReached,
    }))
  );

  return {
    status,
    maxAttemptsReconnectReached: maxReconnectsReached,
    setWsConnect: wsConnect,
    command: wsCommand,
    sendRestApiMessage: wsSendRestApiMessage,
    sendRotatorMessage: wsSendRotatorMessage,
  };
};

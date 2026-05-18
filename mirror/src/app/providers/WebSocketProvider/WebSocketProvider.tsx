import { ProxyRestApiMessage, useWSWorker } from 'hooks/useWSWorker';
import React, { createContext, ReactNode, useContext } from 'react';
import { Payload } from 'types';
import { CommandName } from 'types/api';
import { EntityName } from 'types/settings';

export type CommandType = (
  command: CommandName,
  entity: EntityName,
  payload: Payload
) => void;
interface IWebSocketContext {
  status: string;
  setWsConnect: () => void;
  maxAttemptsReconnectReached: boolean;
  command: CommandType;
  sendRestApiMessage: (
    command: CommandName,
    entity: EntityName,
    msg: Omit<ProxyRestApiMessage, 'id'>
  ) => Promise<unknown>;
  sendRotatorMessage: (
    msg: Omit<ProxyRestApiMessage, 'id'>
  ) => Promise<unknown>;
}
const WebSocketContext = createContext<IWebSocketContext | undefined>(
  undefined
);
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWsCommand must be used within a WebSocketProvider');
  }
  return context;
};
interface IWebSocketProvider {
  children: ReactNode;
}
export const WebSocketProvider: React.FC<IWebSocketProvider> = ({
  children,
}) => {
  const {
    command,
    connect,
    status,
    maxAttemptsReconnectReached,
    sendRestApiMessage,
    sendRotatorMessage,
  } = useWSWorker();
  return (
    <WebSocketContext.Provider
      value={{
        command,
        setWsConnect: connect,
        status,
        maxAttemptsReconnectReached,
        sendRestApiMessage,
        sendRotatorMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

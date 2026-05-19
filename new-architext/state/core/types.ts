import { CommandName } from 'types/api';
import { Payload } from 'types/db';
import { EntityName } from 'types/settings';

export type WsConnectionStatus = 'Init' | 'Open' | 'Closed';

export interface ProxyRestApiMessage {
  id: string;
  method: string;
  path: string;
  body: unknown;
}

export interface ProxyRestApiResponse {
  id: string;
  path: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface PendingRequest<TResponse = unknown> {
  resolve: (value: TResponse) => void;
  reject: (reason: ProxyRestApiResponse) => void;
}

export type OutboundWsPayload = {
  command: CommandName;
  entity: EntityName;
  type: `${CommandName}_${EntityName}`;
  payload: Payload | ProxyRestApiMessage;
};

export type MessagePriority = 'immediate' | 'batched';

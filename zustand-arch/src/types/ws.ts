/**
 * - purpose: WS transport types reused from existing worker contracts
 * - inputs: none
 * - outputs: WS message/action types + local ProxyRestApiMessage shape
 * - source: src/app/workers/types, src/types/api, src/types/db
 * - constraint: keeps payload typed as unknown until narrowed by bridges
 */

export type { CommandName } from '../../../src/types/api';
export type { EntityName } from '../../../src/types/settings';
export type { Payload } from '../../../src/types/db';
export type { WebSocketActions } from '../../../src/app/workers/types/WebSocketActions';
export type {
  WebSocketMessage,
  WebSocketMessageType,
} from '../../../src/app/workers/types/WorkerMessage';
export type {
  ReceivedPayload,
  ReceivedWebSocketMessage,
} from '../../../src/app/workers/types/ReceivedWebSocketMessage';
export type { ReceivedWSPaginatedPayload } from '../../../src/app/workers/types/ReceivedWSPaginatedPayload';

export interface ProxyRestApiMessage {
  id: string;
  method: string;
  path: string;
  body: unknown;
}

export interface ProxyResponseMessage {
  id: string;
  path: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

export type WsStatus = 'Init' | 'Open' | 'Closed';

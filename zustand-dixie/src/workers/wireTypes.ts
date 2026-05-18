/**
 * Purpose: Typed messages between main thread and WebSocket worker.
 * Inputs: none.
 * Outputs: `MainToWorker`, `WorkerToMain`.
 */
import type { WsEntityMessage } from '../domain/entityMessages';

export type MainToWorker =
  | { type: 'CONNECT'; data: string }
  | { type: 'DISCONNECT' }
  | { type: 'SEND_SIMULATED'; data: WsEntityMessage[] };

export type WorkerToMain =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'ERROR'; data: unknown }
  | { type: 'ENTITY_BATCH'; data: WsEntityMessage[] }
  | { type: 'MAX_RECONNECTS_REACHED' };

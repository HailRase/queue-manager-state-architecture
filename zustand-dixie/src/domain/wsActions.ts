/**
 * Purpose: WebSocket action literals (mirror of main app contract).
 * Inputs: none.
 * Outputs: `WsAction` union.
 */
export type WsAction =
  | 'put'
  | 'add'
  | 'bulkPut'
  | 'bulkAdd'
  | 'delete'
  | 'query';

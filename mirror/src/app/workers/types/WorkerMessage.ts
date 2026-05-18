export type WebSocketMessageType =
  | 'MAX_RECONNECTS_REACHED'
  | 'TABLE_DATA_MESSAGE'
  | 'CONNECT'
  | 'NOTIFY'
  | 'SOS_NOTIFY'
  | 'DISCONNECT'
  | 'RECONNECT'
  | 'CLOSE'
  | 'OPEN'
  | 'ERROR'
  | 'SEND'
  | 'QUERY_ID_ACK'
  | 'CALLS_STATISTICS'
  | 'USERS_STATUSES_LOG'
  | 'PROXY_REST_API';
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: unknown;
}

export interface WebSocketState {
  isConnected: boolean;
  maxReconnects: number;
  reconnectAttempts: number;
  maxReconnectsReached: boolean;
}

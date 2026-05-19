export { AppStateRoot } from './integration/AppStateRoot';
export {
  WsBridge,
  wsCommand,
  wsConnect,
  wsSendRestApiMessage,
  wsSendRotatorMessage,
} from './bridge/WsBridge';
export { routeWorkerMessage } from './bridge/routeWorkerMessage';

export { useWs } from './hooks/useWs';
export type { UseWsResult } from './hooks/useWs';
export {
  useCallsStatisticsData,
  useTableEntityState,
  useUsersStatusesLogData,
} from './hooks/useHotStreams';

export { useSessionStore } from './stores/sessionStore';
export { useWsStore, sendRestViaStore, buildWsOutbound } from './stores/wsStore';
export {
  useCallsStatisticsStore,
  enqueueCallsStatisticsMessage,
  enqueueCallsStatisticsMessageSafe,
} from './stores/callsStatisticsStore';
export {
  useUsersStatusesLogStore,
  enqueueUsersStatusesLogMessage,
  enqueueUsersStatusesLogMessageSafe,
} from './stores/usersStatusesLogStore';
export {
  useTableDataStore,
  enqueueTableDataMessage,
  enqueueTableDataMessageSafe,
} from './stores/tableDataStore';
export { useUiStore } from './stores/uiStore';

export type {
  CallsStatisticsWsMessage,
  UsersStatusesLogWsMessage,
} from './core/streamEntityTypes';
export type {
  EntityMapMessage,
  EntityMapBulkPutMessage,
  EntityWithId,
} from './core/entityMapTypes';
export type { WorkerBridgeMessage } from './core/workerBridgeTypes';
export type {
  OutboundWsPayload,
  ProxyRestApiMessage,
  ProxyRestApiResponse,
  WsConnectionStatus,
} from './core/types';

export {
  parseWorkerBridgeMessage,
  isCallsStatisticsWsMessage,
  isTableWSMessage,
  isUsersStatusesLogWsMessage,
} from './core/typeGuards';

export { createMessageBatcher } from './core/batchScheduler';
export * from './core/constants';

/**
 * - purpose: public barrel of the zustand-arch reference module
 * - inputs: none
 * - outputs: stores, selectors, compat hooks, bootstrap, types
 * - constraint: only items meant to be imported by app code live here
 * - usage: consumers should import from this barrel, not deep paths
 */

export { initStores } from './bootstrap/initStores';
export type { InitStoresOptions } from './bootstrap/initStores';

export { useCallsStatisticsStore } from './stores/callsStatisticsStore';
export type { CallsStatisticsState } from './stores/callsStatisticsStore';
export { useUsersStatusesLogStore } from './stores/usersStatusesLogStore';
export type { UsersStatusesLogState } from './stores/usersStatusesLogStore';
export { useTableDataStore, ENTITY_KEYS } from './stores/tableDataStore';
export type { TableDataStoreState } from './stores/tableDataStore';
export { useNotificationsStore } from './stores/notificationsStore';
export type { NotificationsState } from './stores/notificationsStore';
export { useWsStore } from './stores/wsStore';
export { useCurrentUserStore } from './stores/currentUserStore';
export type { CurrentUserState } from './stores/currentUserStore';
export { usePermissionsStore } from './stores/permissionsStore';
export type { PermissionsState } from './stores/permissionsStore';
export { useUserSettingsStore } from './stores/userSettingsStore';
export type { UserSettingsState } from './stores/userSettingsStore';
export { useHelpCenterStore } from './stores/helpCenterStore';
export type { HelpCenterState } from './stores/helpCenterStore';
export { useSystemLoggerStore } from './stores/systemLoggerStore';
export type { LogItem, LogItemType, SystemLoggerState } from './stores/systemLoggerStore';
export { useAvatarStore } from './stores/avatarStore';
export type { AvatarState } from './stores/avatarStore';
export { useAppSettingsStore } from './stores/appSettingsStore';
export type {
  AppSettingsState,
  TableConfig,
  QuickFiltersConfig,
} from './stores/appSettingsStore';

export * from './selectors/callsStatistics.selectors';
export * from './selectors/usersStatusesLog.selectors';
export * from './selectors/tableData.selectors';
export * from './selectors/permissions.selectors';
export * from './selectors/ws.selectors';

export { useCallsStatistics } from './hooks/useCallsStatistics';
export { useUsersStatusesLog } from './hooks/useUsersStatusesLog';
export { useTableDataContext } from './hooks/useTableDataContext';
export { useWebSocketContext } from './hooks/useWebSocketContext';
export { usePermissions } from './hooks/usePermissions';
export { useUserSettings } from './hooks/useUserSettings';
export { useDataQuery } from './hooks/useDataQuery';

export type {
  CommandName,
  EntityName,
  Payload,
  ProxyRestApiMessage,
  ReceivedWebSocketMessage,
  WebSocketActions,
  WebSocketMessage,
  WebSocketMessageType,
  WsStatus,
} from './types/ws';
export type {
  EntityKey,
  EntitySlice,
  SlicesMap,
  TableData,
  TableDataState,
  TableWSMessage,
} from './types/tables';
export type { INotification, ISOSNotification } from './types/notifications';

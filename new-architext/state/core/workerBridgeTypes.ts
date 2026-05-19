import { TableWSMessage } from 'app/providers/TableDataProvider/model/types';
import { QueryID } from 'shared/db-types';
import {
  INotification,
  ISOSNotification,
} from 'widgets/Notification/model/Notification.interfaces';

import {
  CallsStatisticsWsMessage,
  UsersStatusesLogWsMessage,
} from './streamEntityTypes';
import { ProxyRestApiResponse } from './types';

export type WorkerBridgeMessage =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'ERROR'; data: Event }
  | { type: 'MAX_RECONNECTS_REACHED' }
  | { type: 'NOTIFY'; data: INotification }
  | { type: 'SOS_NOTIFY'; data: ISOSNotification }
  | { type: 'QUERY_ID_ACK'; data: QueryID }
  | { type: 'TABLE_DATA_MESSAGE'; data: TableWSMessage }
  | { type: 'CALLS_STATISTICS'; data: CallsStatisticsWsMessage }
  | { type: 'USERS_STATUSES_LOG'; data: UsersStatusesLogWsMessage }
  | { type: 'PROXY_REST_API'; data: ProxyRestApiResponse };

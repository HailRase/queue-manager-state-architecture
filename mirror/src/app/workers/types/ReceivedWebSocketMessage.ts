import { ReceivedWSPaginatedPayload } from 'app/workers/types';
import { ReceivedWSPayload } from 'shared/db-types';
import { EntityName } from 'types/settings';

import { WebSocketActions } from './WebSocketActions';

export type ReceivedPayload = ReceivedWSPayload | ReceivedWSPaginatedPayload;

export interface ReceivedWebSocketMessage {
  action: WebSocketActions;
  entity: EntityName;
  payload: ReceivedPayload;
}

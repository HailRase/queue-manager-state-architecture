import { ENTITY_NAMES } from 'constants/settings';
import { CallsStatistics, ILogUserStatus } from 'shared/db-types';

import { EntityMapMessage } from './entityMapTypes';

export type CallsStatisticsEntity = typeof ENTITY_NAMES.CALLS_STATISTICS;
export type UsersStatusesLogEntity = typeof ENTITY_NAMES.USERS_STATUSES_LOG;

export type CallsStatisticsWsMessage = EntityMapMessage<
  CallsStatistics,
  CallsStatisticsEntity
>;

export type UsersStatusesLogWsMessage = EntityMapMessage<
  ILogUserStatus,
  UsersStatusesLogEntity
>;

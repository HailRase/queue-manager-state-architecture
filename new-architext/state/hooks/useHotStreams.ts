import { useShallow } from 'zustand/react/shallow';

import {
  selectCallsStatisticsList,
  useCallsStatisticsStore,
} from '../stores/callsStatisticsStore';
import { selectTableEntity, useTableDataStore } from '../stores/tableDataStore';
import {
  selectUsersStatusesLogList,
  useUsersStatusesLogStore,
} from '../stores/usersStatusesLogStore';
import { TableDataState } from 'app/providers/TableDataProvider/model/types';

export const useCallsStatisticsData = () =>
  useCallsStatisticsStore(useShallow(selectCallsStatisticsList));

export const useUsersStatusesLogData = () =>
  useUsersStatusesLogStore(useShallow(selectUsersStatusesLogList));

export const useTableEntityState = <K extends keyof TableDataState>(entity: K) =>
  useTableDataStore(useShallow(selectTableEntity(entity)));

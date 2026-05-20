/**
 * - purpose: ready-made selectors for usersStatusesLogStore consumers
 * - inputs: userId / id / nothing
 * - outputs: hooks returning Set, item, count, or stable array (via version)
 * - constraint: array view memoized by monotonic version
 * - usage: prefer these over inline selectors in components
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { ILogUserStatus } from '../../../src/shared/db-types';
import { useUsersStatusesLogStore } from '../stores/usersStatusesLogStore';
import { useStableArrayFromMap } from '../utils/stableArrayFromMap';

const EMPTY_ID_SET: ReadonlySet<number> = new Set<number>();

export const useUsersStatusesByUser = (userId: number): ReadonlySet<number> => {
  return useUsersStatusesLogStore(
    useShallow((s) => s.byUser.get(userId) ?? EMPTY_ID_SET)
  );
};

export const useUsersStatusesByUserItems = (userId: number): readonly ILogUserStatus[] => {
  const ids = useUsersStatusesByUser(userId);
  const byId = useUsersStatusesLogStore((s) => s.byId);
  const version = useUsersStatusesLogStore((s) => s.version);
  return useMemo(() => {
    const out: ILogUserStatus[] = [];
    for (const id of ids) {
      const item = byId.get(id);
      if (item) out.push(item);
    }
    return out;
  }, [ids, byId, version]);
};

export const useUsersStatusesById = (id: number): ILogUserStatus | undefined => {
  return useUsersStatusesLogStore((s) => s.byId.get(id));
};

export const useUsersStatusesSize = (): number => {
  return useUsersStatusesLogStore((s) => s.byId.size);
};

export const useUsersStatusesList = (): readonly ILogUserStatus[] => {
  const byId = useUsersStatusesLogStore((s) => s.byId);
  const version = useUsersStatusesLogStore((s) => s.version);
  return useStableArrayFromMap(byId, version);
};

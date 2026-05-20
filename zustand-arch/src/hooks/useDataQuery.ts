/**
 * - purpose: legacy-compatible drop-in for src/hooks/useDataQuery
 * - inputs: entity, payloadData?, resetEntity?
 * - outputs: boolean isLoading
 * - constraint: uses wsStore.command + Dexie query_id table; semantics 1:1
 * - removal: keep until all callers migrate to a query-store abstraction
 */

import type { Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { uuidv7 } from 'uuidv7';

import { db } from '../../../src/app/db';
import { COMMAND_NAMES } from '../../../src/constants/api';
import type { Payload } from '../../../src/types/db';
import { useWsStore } from '../stores/wsStore';
import type { EntityName } from '../types/ws';

const dbAsTableMap = db as unknown as Record<string, Table<unknown> | undefined>;

export const useDataQuery = (
  entity: EntityName | null,
  payloadData?: { isPayload: boolean; payload: Record<string, unknown> },
  resetEntity?: EntityName
): boolean => {
  const wsStatus = useWsStore((s) => s.status);
  const [isLoading, setIsLoading] = useState(false);
  const [queryFetchId] = useState(() => uuidv7());

  useEffect(() => {
    if (wsStatus !== 'Open') return;
    void (async () => {
      await db.query_id.delete(queryFetchId);
      if (entity && resetEntity) {
        const table = dbAsTableMap[resetEntity];
        if (table) await table.clear();
      }
      if (!entity) return;
      const command = useWsStore.getState().command;
      if (payloadData) {
        if (!payloadData.isPayload) return;
        setIsLoading(true);
        const merged = { ...payloadData.payload, id: queryFetchId } as unknown as Payload;
        command(COMMAND_NAMES.QUERY_ID, entity, merged);
        return;
      }
      setIsLoading(true);
      command(COMMAND_NAMES.QUERY_ID, entity, { id: queryFetchId });
    })();
  }, [wsStatus, queryFetchId, entity, payloadData, resetEntity]);

  useLiveQuery(async () => {
    const found = await db.query_id.where({ id: queryFetchId }).first();
    if (found) setIsLoading(false);
  });

  return isLoading;
};

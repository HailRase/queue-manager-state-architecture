/**
 * Purpose: Row types per entity for Dexie + Zustand (strict map).
 * Inputs: none.
 * Outputs: `BaseRow`, `EntityRowMap`.
 */
import type { EntityName } from '../constants/entityNames';

export type BaseRow = {
  id: string;
  updatedAt: number;
};

export type EntityRowMap = {
  users: BaseRow & { login: string; roleIds: string };
  calls: BaseRow & { displayName: string; status: string };
  company: BaseRow & { title: string; state: string };
  roles: BaseRow & { title: string; permissionKeys: string };
  permissions: BaseRow & { key: string; enabled: boolean };
  notification: BaseRow & { body: string; read: boolean };
  notification_sos: BaseRow & { body: string; level: string };
  abonent: BaseRow & { phone: string };
  users_statuses_log: BaseRow & { userId: string; durationMs: number };
  calls_statistics: BaseRow & {
    queueId: string;
    metric: string;
    value: number;
  };
  operator_status_history: BaseRow & { operatorId: string; status: string };
  query_id: BaseRow & { queryKey: string; ack: boolean };
  organization_structure: BaseRow & { nodeId: string; parentId: string };
  company_runtime: BaseRow & { companyKey: string; runtimeJson: string };
  selection: BaseRow & { label: string };
  strategy_call: BaseRow & { name: string };
  campaign_journal: BaseRow & { campaignId: string; note: string };
  queues: BaseRow & { name: string; phone: string };
  skills: BaseRow & { title: string };
  current_user: BaseRow & { sessionId: string };
  config: BaseRow & { name: string; valueJson: string };
  contacts: BaseRow & { email: string };
  integration_settings: BaseRow & { provider: string; settingsJson: string };
};

export type EntityBucket<E extends EntityName> = Record<string, EntityRowMap[E]>;

export type AllEntityBuckets = {
  [E in EntityName]: EntityBucket<E>;
};

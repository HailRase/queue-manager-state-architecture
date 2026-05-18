/**
 * Purpose: Canonical entity name list and `EntityName` union.
 * Inputs: none.
 * Outputs: `ENTITY_NAMES`, `EntityName`, `isEntityName`.
 */
export const ENTITY_NAMES = [
  'users',
  'calls',
  'company',
  'roles',
  'permissions',
  'notification',
  'notification_sos',
  'abonent',
  'users_statuses_log',
  'calls_statistics',
  'operator_status_history',
  'query_id',
  'organization_structure',
  'company_runtime',
  'selection',
  'strategy_call',
  'campaign_journal',
  'queues',
  'skills',
  'current_user',
  'config',
  'contacts',
  'integration_settings',
] as const;

export type EntityName = (typeof ENTITY_NAMES)[number];

export function isEntityName(value: unknown): value is EntityName {
  return (
    typeof value === 'string' &&
    (ENTITY_NAMES as readonly string[]).includes(value)
  );
}

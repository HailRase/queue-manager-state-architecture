/**
 * Purpose: Dexie schema with one table per `EntityName`.
 * Inputs: IndexedDB.
 * Outputs: `AppDb`, singleton `db`.
 */
import Dexie, { type Table } from 'dexie';
import type { EntityRowMap } from '../domain/entityRows';

export class AppDb extends Dexie {
  users!: Table<EntityRowMap['users']>;
  calls!: Table<EntityRowMap['calls']>;
  company!: Table<EntityRowMap['company']>;
  roles!: Table<EntityRowMap['roles']>;
  permissions!: Table<EntityRowMap['permissions']>;
  notification!: Table<EntityRowMap['notification']>;
  notification_sos!: Table<EntityRowMap['notification_sos']>;
  abonent!: Table<EntityRowMap['abonent']>;
  users_statuses_log!: Table<EntityRowMap['users_statuses_log']>;
  calls_statistics!: Table<EntityRowMap['calls_statistics']>;
  operator_status_history!: Table<EntityRowMap['operator_status_history']>;
  query_id!: Table<EntityRowMap['query_id']>;
  organization_structure!: Table<EntityRowMap['organization_structure']>;
  company_runtime!: Table<EntityRowMap['company_runtime']>;
  selection!: Table<EntityRowMap['selection']>;
  strategy_call!: Table<EntityRowMap['strategy_call']>;
  campaign_journal!: Table<EntityRowMap['campaign_journal']>;
  queues!: Table<EntityRowMap['queues']>;
  skills!: Table<EntityRowMap['skills']>;
  current_user!: Table<EntityRowMap['current_user']>;
  config!: Table<EntityRowMap['config']>;
  contacts!: Table<EntityRowMap['contacts']>;
  integration_settings!: Table<EntityRowMap['integration_settings']>;

  constructor() {
    super('ZustandDixieArch');
    this.version(2).stores({
      users: 'id, updatedAt',
      calls: 'id, updatedAt',
      company: 'id, updatedAt',
      roles: 'id, updatedAt',
      permissions: 'id, updatedAt',
      notification: 'id, updatedAt',
      notification_sos: 'id, updatedAt',
      abonent: 'id, updatedAt',
      users_statuses_log: 'id, updatedAt',
      calls_statistics: 'id, updatedAt',
      operator_status_history: 'id, updatedAt',
      query_id: 'id, updatedAt',
      organization_structure: 'id, updatedAt',
      company_runtime: 'id, updatedAt',
      selection: 'id, updatedAt',
      strategy_call: 'id, updatedAt',
      campaign_journal: 'id, updatedAt',
      queues: 'id, updatedAt',
      skills: 'id, updatedAt',
      current_user: 'id, updatedAt',
      config: 'id, updatedAt',
      contacts: 'id, updatedAt',
      integration_settings: 'id, updatedAt',
    });
  }
}

export const db = new AppDb();

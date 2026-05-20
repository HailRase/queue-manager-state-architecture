/**
 * - purpose: re-export EntityName union from project settings module
 * - inputs: none
 * - outputs: EntityName, EntityNames, TableDataEntityNames
 * - source: ../../../src/types/settings.ts
 * - boundary: type-only barrier between zustand-arch and the host app
 */

export type {
  EntityName,
  EntityNames,
  TableDataEntityNames,
} from '../../../src/types/settings';

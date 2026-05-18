/**
 * Purpose: Re-export store-related types for consumers.
 * Inputs: none.
 * Outputs: `EntityStore`, `WsEntityMessage`.
 */
export type { EntityStore, EntityHydrationStatus } from './entityStore';
export type { WsEntityMessage } from '../domain/entityMessages';

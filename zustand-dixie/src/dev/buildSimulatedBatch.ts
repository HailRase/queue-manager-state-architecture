/**
 * Purpose: Deterministic demo batch of `WsEntityMessage` for worker simulation.
 * Inputs: none.
 * Outputs: `buildSimulatedBatch`.
 */
import type { WsEntityMessage } from '../domain/entityMessages';

export function buildSimulatedBatch(): WsEntityMessage[] {
  const t = Date.now();
  return [
    {
      entity: 'users',
      action: 'put',
      payload: {
        id: 'u-demo',
        updatedAt: t,
        login: 'demo-user',
        roleIds: 'r1,r2',
      },
    },
    {
      entity: 'calls',
      action: 'bulkPut',
      payload: [
        {
          id: 'c1',
          updatedAt: t,
          displayName: 'Inbound #1',
          status: 'ringing',
        },
        {
          id: 'c2',
          updatedAt: t,
          displayName: 'Outbound #2',
          status: 'answered',
        },
      ],
    },
    {
      entity: 'company',
      action: 'add',
      payload: {
        id: 'co1',
        updatedAt: t,
        title: 'ACME',
        state: 'active',
      },
    },
    {
      entity: 'config',
      action: 'put',
      payload: {
        id: 'cfg-theme',
        updatedAt: t,
        name: 'theme',
        valueJson: '{"mode":"dark"}',
      },
    },
    {
      entity: 'calls',
      action: 'delete',
      payload: 'c2',
    },
  ];
}

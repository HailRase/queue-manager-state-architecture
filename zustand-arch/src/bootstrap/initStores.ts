/**
 * - purpose: single entry-point that wires all bridges before React mounts
 * - inputs: QmsDb instance + optional Worker (DI for tests)
 * - outputs: teardown disposing all bridges in reverse order
 * - constraint: must run BEFORE ReactDOM.createRoot(...).render(...)
 * - usage: call once from index.tsx; store returned teardown for HMR
 */

import type { QmsDb } from '../../../src/app/db';
import { initDexieBridge } from '../bridges/dexieBridge';
import { initSoftphoneBridge } from '../bridges/softphoneBridge';
import { initWsBridge } from '../bridges/wsBridge';

export interface InitStoresOptions {
  db: QmsDb;
  worker?: Worker;
}

export const initStores = ({ db, worker }: InitStoresOptions): (() => void) => {
  const tearWs = initWsBridge(worker);
  const tearDexie = initDexieBridge(db);
  const tearSoftphone = initSoftphoneBridge();
  return () => {
    tearSoftphone();
    tearDexie();
    tearWs();
  };
};

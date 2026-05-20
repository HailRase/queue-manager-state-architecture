/**
 * - purpose: WS connection state selectors
 * - inputs: none
 * - outputs: hooks returning primitives (status, isOpen flag, reconnect flag)
 * - constraint: primitive selectors avoid object-equality rerenders
 * - usage: top-level chrome and connection banners
 */

import { useWsStore } from '../stores/wsStore';
import type { WsStatus } from '../types/ws';

export const useWsStatus = (): WsStatus => useWsStore((s) => s.status);

export const useWsIsOpen = (): boolean => useWsStore((s) => s.status === 'Open');

export const useMaxAttemptsReached = (): boolean =>
  useWsStore((s) => s.maxAttemptsReconnectReached);

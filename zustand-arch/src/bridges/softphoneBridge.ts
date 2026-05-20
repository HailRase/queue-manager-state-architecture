/**
 * - purpose: bridge softphone window-events into systemLoggerStore
 * - inputs: window events: connectedEvent, connectingEvent, disconnected, registered, unregistered, registrationFailed
 * - outputs: teardown removing all listeners and interval
 * - constraint: replaces window CustomEvent bus consumption in useSoftPhoneLogs
 * - boundary: only place inside zustand-arch that touches window event API
 */

import { useSystemLoggerStore } from '../stores/systemLoggerStore';

interface SoftphoneEventDetail {
  text?: string;
  type?: 'error' | 'info';
}

const SOFTPHONE_STATUS_POLL_MS = 1000;

interface SoftphoneWindow extends Window {
  Softphone?: { isSoftPhoneWsConnected?: boolean };
}

const isSoftphoneEvent = (
  event: Event
): event is CustomEvent<SoftphoneEventDetail> => {
  return 'detail' in event && typeof (event as CustomEvent).detail === 'object';
};

const extractDetail = (event: Event): SoftphoneEventDetail => {
  if (!isSoftphoneEvent(event)) return {};
  const raw = event.detail ?? {};
  const text = typeof raw.text === 'string' ? raw.text : '';
  const type = raw.type === 'error' ? 'error' : 'info';
  return { text, type };
};

const pushLog = (event: Event): void => {
  const { text, type } = extractDetail(event);
  if (!text) return;
  useSystemLoggerStore.getState().addLog(text, type ?? 'info');
};

export const initSoftphoneBridge = (): (() => void) => {
  const store = useSystemLoggerStore.getState();

  const onConnected = (event: Event): void => {
    store.setSoftPhoneWsConnected(true);
    pushLog(event);
  };
  const onConnecting = (event: Event): void => {
    pushLog(event);
  };
  const onDisconnected = (event: Event): void => {
    store.setSoftPhoneWsConnected(false);
    pushLog(event);
  };
  const onRegistered = (event: Event): void => {
    store.setSoftPhoneOnline(true);
    pushLog(event);
  };
  const onUnregistered = (event: Event): void => {
    store.setSoftPhoneOnline(false);
    pushLog(event);
  };
  const onRegistrationFailed = (event: Event): void => {
    pushLog(event);
  };

  window.addEventListener('connectedEvent', onConnected);
  window.addEventListener('connectingEvent', onConnecting);
  window.addEventListener('disconnected', onDisconnected);
  window.addEventListener('registered', onRegistered);
  window.addEventListener('unregistered', onUnregistered);
  window.addEventListener('registrationFailed', onRegistrationFailed);

  const intervalId = window.setInterval(() => {
    const softphoneWindow = window as SoftphoneWindow;
    const connected = Boolean(
      softphoneWindow.Softphone?.isSoftPhoneWsConnected
    );
    useSystemLoggerStore.getState().setSoftPhoneWsConnected(connected);
  }, SOFTPHONE_STATUS_POLL_MS);

  return () => {
    window.removeEventListener('connectedEvent', onConnected);
    window.removeEventListener('connectingEvent', onConnecting);
    window.removeEventListener('disconnected', onDisconnected);
    window.removeEventListener('registered', onRegistered);
    window.removeEventListener('unregistered', onUnregistered);
    window.removeEventListener('registrationFailed', onRegistrationFailed);
    window.clearInterval(intervalId);
  };
};

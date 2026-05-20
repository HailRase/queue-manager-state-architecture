/**
 * - purpose: softphone logs + modal visibility + softphone status flags
 * - inputs: addLog/toggleModal/setSoftPhoneOnline/setSoftPhoneWsConnected
 * - outputs: logs[], isLoggerModalVisible, isSoftPhoneOnline, isSoftPhoneWsConnected
 * - replaces: SystemLoggerProvider + useSoftPhoneLogs
 * - constraint: window-event listeners live in softphoneBridge, not here
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { withDevtools } from '../middleware/withDevtools';

export type LogItemType = 'error' | 'info';

export interface LogItem {
  id: string;
  datetime: string;
  logText: string;
  type: LogItemType;
}

const MAX_LOG_BUFFER = 500;

const makeLogId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const nowIsoString = (): string => new Date().toISOString();

export interface SystemLoggerState {
  logs: LogItem[];
  isLoggerModalVisible: boolean;
  isSoftPhoneOnline: boolean;
  isSoftPhoneWsConnected: boolean;
  addLog: (logText: string, type: LogItemType) => void;
  toggleModal: () => void;
  setLoggerModalVisible: (visible: boolean) => void;
  setSoftPhoneOnline: (online: boolean) => void;
  setSoftPhoneWsConnected: (connected: boolean) => void;
  clearLogs: () => void;
}

export const useSystemLoggerStore = create<SystemLoggerState>()(
  subscribeWithSelector(
    withDevtools('systemLoggerStore', (set) => ({
      logs: [],
      isLoggerModalVisible: false,
      isSoftPhoneOnline: false,
      isSoftPhoneWsConnected: false,
      addLog: (logText, type) => {
        const entry: LogItem = {
          id: makeLogId(),
          datetime: nowIsoString(),
          logText,
          type,
        };
        set((state) => {
          const next = [entry, ...state.logs];
          if (next.length > MAX_LOG_BUFFER) next.length = MAX_LOG_BUFFER;
          return { logs: next };
        });
      },
      toggleModal: () =>
        set((state) => ({ isLoggerModalVisible: !state.isLoggerModalVisible })),
      setLoggerModalVisible: (visible) => set({ isLoggerModalVisible: visible }),
      setSoftPhoneOnline: (online) => set({ isSoftPhoneOnline: online }),
      setSoftPhoneWsConnected: (connected) => set({ isSoftPhoneWsConnected: connected }),
      clearLogs: () => set({ logs: [] }),
    }))
  )
);

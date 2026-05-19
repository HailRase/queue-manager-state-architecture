import { create } from 'zustand';

interface UiState {
  helpCenterPage: string;
  isLoggerModalVisible: boolean;
  isSoftPhoneWsConnected: boolean;
  isSoftPhoneOnline: boolean;

  setHelpCenterPage: (page: string) => void;
  setLoggerModalVisible: (visible: boolean) => void;
  setSoftPhoneWsConnected: (connected: boolean) => void;
  setSoftPhoneOnline: (online: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  helpCenterPage: '',
  isLoggerModalVisible: false,
  isSoftPhoneWsConnected: false,
  isSoftPhoneOnline: false,

  setHelpCenterPage: (helpCenterPage) => set({ helpCenterPage }),
  setLoggerModalVisible: (isLoggerModalVisible) => set({ isLoggerModalVisible }),
  setSoftPhoneWsConnected: (isSoftPhoneWsConnected) =>
    set({ isSoftPhoneWsConnected }),
  setSoftPhoneOnline: (isSoftPhoneOnline) => set({ isSoftPhoneOnline }),
}));

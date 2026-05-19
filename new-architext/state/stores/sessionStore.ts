import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  sid: string | null;
  setSid: (sid: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sid: typeof localStorage !== 'undefined' ? localStorage.getItem('sid') : null,
      setSid: (sid) => {
        if (sid) {
          localStorage.setItem('sid', sid);
        } else {
          localStorage.removeItem('sid');
        }
        set({ sid });
      },
      clearSession: () => {
        localStorage.removeItem('sid');
        set({ sid: null });
      },
    }),
    {
      name: 'ocp-session',
      partialize: (state) => ({ sid: state.sid }),
    }
  )
);

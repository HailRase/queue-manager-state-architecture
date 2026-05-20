/**
 * - purpose: track currently active help-center documentation page
 * - inputs: string identifier of the current page
 * - outputs: currentDocPage, setCurrentDocPage
 * - replaces: HelpCenterProvider
 */

import { create } from 'zustand';

import { withDevtools } from '../middleware/withDevtools';

export interface HelpCenterState {
  currentDocPage: string;
  setCurrentDocPage: (page: string) => void;
}

export const useHelpCenterStore = create<HelpCenterState>()(
  withDevtools('helpCenterStore', (set) => ({
    currentDocPage: '',
    setCurrentDocPage: (page) => set({ currentDocPage: page }),
  }))
);

'use client';

import { create } from 'zustand';

/**
 * UI store — ephemeral overlay state (toasts, active bottom sheets).
 * Decoupled from server data so re-renders of `uiStore` don't invalidate
 * data caches in `tankStore` / `fishStore`.
 */
export interface ToastItem {
  id: string;
  message: string;
  tone: 'success' | 'info' | 'error';
}

export interface UIState {
  toasts: ToastItem[];
  activeSheet: string | null;
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
  openSheet: (key: string) => void;
  closeSheet: () => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  activeSheet: null,
  pushToast: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: `t_${++toastCounter}` }],
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openSheet: (key) => set({ activeSheet: key }),
  closeSheet: () => set({ activeSheet: null }),
}));

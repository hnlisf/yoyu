'use client';

import { create } from 'zustand';
import type { Fish } from '../api';

/**
 * Fish store — caches individual fish detail and the per-fish growth history
 * fetched from the (mocked) `/api/fish/:id/growth-history` endpoint.
 */
export interface FishDetail {
  fish: Fish;
  feedHistory: Array<{ id: string; fedAt: string; amount: string }>;
}

export interface FishState {
  byId: Record<string, FishDetail>;
  isLoading: boolean;
  setFishDetail: (id: string, detail: FishDetail) => void;
  setFeedHistory: (id: string, feedHistory: FishDetail['feedHistory']) => void;
  patchFish: (id: string, patch: Partial<Fish>) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useFishStore = create<FishState>((set) => ({
  byId: {},
  isLoading: false,
  setFishDetail: (id, detail) =>
    set((s) => ({ byId: { ...s.byId, [id]: detail } })),
  setFeedHistory: (id, feedHistory) =>
    set((s) => {
      const existing = s.byId[id];
      if (!existing) return s;
      return { byId: { ...s.byId, [id]: { ...existing, feedHistory } } };
    }),
  patchFish: (id, patch) =>
    set((s) => {
      const existing = s.byId[id];
      if (!existing) return s;
      return { byId: { ...s.byId, [id]: { ...existing, fish: { ...existing.fish, ...patch } } } };
    }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ byId: {}, isLoading: false }),
}));

'use client';

import { create } from 'zustand';
import type { Fish, FishTank } from '../api';

/**
 * Tank store — caches the user's list of tanks and a "current tank" pointer
 * for detail views. Pages mutate this through `setTanks` / `setCurrentTank`
 * after SWR fetches so re-navigations don't re-trigger network requests.
 */
export interface TankState {
  tanks: FishTank[];
  currentTankId: string | null;
  isLoading: boolean;
  error: string | null;
  setTanks: (tanks: FishTank[]) => void;
  upsertTank: (tank: FishTank) => void;
  removeTank: (id: string) => void;
  setCurrentTank: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
  /** Update one fish inside a tank (e.g. after feeding). */
  updateFish: (tankId: string, fish: Fish) => void;
}

export const useTankStore = create<TankState>((set) => ({
  tanks: [],
  currentTankId: null,
  isLoading: false,
  error: null,
  setTanks: (tanks) => set({ tanks, isLoading: false, error: null }),
  upsertTank: (tank) =>
    set((s) => {
      const idx = s.tanks.findIndex((t) => t.id === tank.id);
      if (idx === -1) return { tanks: [...s.tanks, tank] };
      const next = s.tanks.slice();
      next[idx] = tank;
      return { tanks: next };
    }),
  removeTank: (id) => set((s) => ({ tanks: s.tanks.filter((t) => t.id !== id) })),
  setCurrentTank: (id) => set({ currentTankId: id }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  updateFish: (tankId, fish) =>
    set((s) => ({
      tanks: s.tanks.map((t) =>
        t.id !== tankId || !t.fish
          ? t
          : { ...t, fish: t.fish.map((f) => (f.id === fish.id ? fish : f)) },
      ),
    })),
}));

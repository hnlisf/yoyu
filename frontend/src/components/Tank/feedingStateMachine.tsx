'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';

/**
 * v5.0 Feeding State Machine
 *
 * IDLE → FEEDING → DETECTING → SWIMMING_TO_FOOD → EATING → DONE → IDLE
 *
 * Driven by a single dispatcher via React Context.
 * Multiple fish subscribe independently to determine their own animation state.
 */

// --- Types ---

export type FeedingPhase =
  | 'IDLE'
  | 'FEEDING'
  | 'DETECTING'
  | 'SWIMMING_TO_FOOD'
  | 'EATING'
  | 'DONE';

export interface FoodParticle {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100 (top=0)
}

export interface FeedingState {
  phase: FeedingPhase;
  /** Food particles currently visible */
  particles: FoodParticle[];
  /** Which fish IDs are currently eating/approaching */
  eatingFishIds: Set<string>;
  /** Timestamp when feeding started (ms) */
  startedAt: number | null;
}

type FeedingAction =
  | { type: 'START_FEEDING'; particles: FoodParticle[] }
  | { type: 'PHASE'; phase: FeedingPhase }
  | { type: 'FISH_ARRIVED'; fishId: string }
  | { type: 'FISH_DONE'; fishId: string }
  | { type: 'RESET' };

// --- Phase durations (ms) ---
const PHASE_DURATIONS: Record<Exclude<FeedingPhase, 'IDLE'>, number> = {
  FEEDING: 300,
  DETECTING: 200,
  SWIMMING_TO_FOOD: 800,
  EATING: 600,
  DONE: 2000,
};

function feedingReducer(state: FeedingState, action: FeedingAction): FeedingState {
  switch (action.type) {
    case 'START_FEEDING':
      return {
        phase: 'FEEDING',
        particles: action.particles,
        eatingFishIds: new Set(),
        startedAt: Date.now(),
      };

    case 'PHASE':
      return { ...state, phase: action.phase };

    case 'FISH_ARRIVED': {
      const next = new Set(state.eatingFishIds);
      next.add(action.fishId);
      return { ...state, eatingFishIds: next };
    }

    case 'FISH_DONE': {
      const next = new Set(state.eatingFishIds);
      next.delete(action.fishId);
      return { ...state, eatingFishIds: next };
    }

    case 'RESET':
      return {
        phase: 'IDLE',
        particles: [],
        eatingFishIds: new Set(),
        startedAt: null,
      };

    default:
      return state;
  }
}

const initialState: FeedingState = {
  phase: 'IDLE',
  particles: [],
  eatingFishIds: new Set(),
  startedAt: null,
};

// --- Context ---

interface FeedingContextValue {
  state: FeedingState;
  dispatch: React.Dispatch<FeedingAction>;
  startFeeding: (particles: FoodParticle[]) => void;
}

const FeedingContext = createContext<FeedingContextValue | null>(null);

export function FeedingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(feedingReducer, initialState);

  const startFeeding = useCallback(
    (particles: FoodParticle[]) => {
      dispatch({ type: 'START_FEEDING', particles });

      // Auto-advance through phases
      const schedule = (phase: FeedingPhase, delay: number) => {
        setTimeout(() => {
          dispatch({ type: 'PHASE', phase });
        }, delay);
      };

      let delay = 0;
      for (const p of ['FEEDING', 'DETECTING', 'SWIMMING_TO_FOOD', 'EATING', 'DONE'] as const) {
        delay += PHASE_DURATIONS[p as keyof typeof PHASE_DURATIONS];
        schedule(p, delay);
      }

      // Reset after DONE
      setTimeout(() => {
        dispatch({ type: 'RESET' });
      }, delay + PHASE_DURATIONS.DONE);
    },
    [],
  );

  return (
    <FeedingContext.Provider value={{ state, dispatch, startFeeding }}>
      {children}
    </FeedingContext.Provider>
  );
}

export function useFeeding() {
  const ctx = useContext(FeedingContext);
  if (!ctx) throw new Error('useFeeding must be used within FeedingProvider');
  return ctx;
}

/**
 * Get the animation class for a specific fish based on feeding state.
 * Returns null if fish should use normal swim animation.
 */
export function getFishFeedingClass(
  fishId: string,
  feedingState: FeedingState,
): string | null {
  const { phase, eatingFishIds } = feedingState;

  // Only fish that "arrived" (close enough to food) get eating animation
  const isEating = eatingFishIds.has(fishId);

  switch (phase) {
    case 'IDLE':
      return null;
    case 'FEEDING':
    case 'DETECTING':
      return null; // normal swim, fish hasn't detected yet
    case 'SWIMMING_TO_FOOD':
      // Fish swimming toward food — speed up and orient
      return isEating ? 'fish-swim-fast' : null;
    case 'EATING':
      return isEating ? 'fish-eating' : null;
    case 'DONE':
      return isEating ? 'fish-done' : null;
    default:
      return null;
  }
}

/**
 * Determine if a fish should "detect" the food (i.e., is close enough).
 * Simple distance-based: fish within ~200px of a food particle.
 */
export function isFishNearFood(
  fishX: number,
  fishY: number,
  particles: FoodParticle[],
  threshold = 0.3,
): boolean {
  return particles.some((p) => {
    const dx = Math.abs(p.x / 100 - fishX);
    const dy = Math.abs(p.y / 100 - fishY);
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  });
}

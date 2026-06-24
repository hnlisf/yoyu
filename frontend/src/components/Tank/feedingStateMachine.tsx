'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
} from 'react';

/**
 * v6.0 Feeding State Machine
 *
 * IDLE → HUNGRY → SEEKING → EATING → FULL → IDLE
 *
 * HUNGRY:    Food particles dropped, falling via CSS animation.
 * SEEKING:   Fish detect nearby food (<50px) and swim toward it.
 * EATING:    Fish reaches food (<10px) → eating animation, food disappears.
 * FULL:      Fish sinks 5px → 2s timer → returns to IDLE.
 */

// --- Types ---

export type FeedingPhase =
  | 'IDLE'
  | 'HUNGRY'
  | 'SEEKING'
  | 'EATING'
  | 'FULL';

export interface FoodParticle {
  id: string;
  x: number;       // pixel position (or percentage, depends on context)
  y: number;
  eaten: boolean;
  /** Timestamp when particle was created */
  createdAt: number;
  /** CSS animation delay for staggered falling */
  fallDelay: number;
}

export type FishFeedPhase = 'idle' | 'seeking' | 'eating' | 'full';

export interface FishFeedState {
  fishId: string;
  phase: FishFeedPhase;
  targetParticleId: string | null;
  sinkStartAt: number | null; // timestamp when FULL started
}

export interface FeedingState {
  phase: FeedingPhase;
  particles: FoodParticle[];
  fishStates: Map<string, FishFeedState>;
  startedAt: number | null;
}

type FeedingAction =
  | { type: 'START_FEEDING'; particles: Array<{ id: string; x: number; y: number }> }
  | { type: 'SET_PHASE'; phase: FeedingPhase }
  | { type: 'FISH_SEEKING'; fishId: string; particleId: string }
  | { type: 'FISH_EATING'; fishId: string; particleId: string }
  | { type: 'FISH_FULL'; fishId: string }
  | { type: 'FISH_IDLE'; fishId: string }
  | { type: 'REMOVE_PARTICLE'; particleId: string }
  | { type: 'RESET' };

// --- Phase durations (ms) ---
const PHASE_DURATIONS: Record<Exclude<FeedingPhase, 'IDLE'>, number> = {
  HUNGRY: 500,
  SEEKING: 1200,
  EATING: 800,
  FULL: 2000,
};

function feedingReducer(
  state: FeedingState,
  action: FeedingAction,
): FeedingState {
  switch (action.type) {
    case 'START_FEEDING': {
      const now = Date.now();
      const particles: FoodParticle[] = action.particles.map((p, i) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        eaten: false,
        createdAt: now,
        fallDelay: i * 100,
      }));
      return {
        phase: 'HUNGRY',
        particles,
        fishStates: new Map(),
        startedAt: now,
      };
    }

    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'FISH_SEEKING': {
      const next = new Map(state.fishStates);
      next.set(action.fishId, {
        fishId: action.fishId,
        phase: 'seeking',
        targetParticleId: action.particleId,
        sinkStartAt: null,
      });
      return { ...state, fishStates: next };
    }

    case 'FISH_EATING': {
      const next = new Map(state.fishStates);
      next.set(action.fishId, {
        fishId: action.fishId,
        phase: 'eating',
        targetParticleId: action.particleId,
        sinkStartAt: null,
      });
      return { ...state, fishStates: next };
    }

    case 'FISH_FULL': {
      const next = new Map(state.fishStates);
      next.set(action.fishId, {
        fishId: action.fishId,
        phase: 'full',
        targetParticleId: null,
        sinkStartAt: Date.now(),
      });
      return { ...state, fishStates: next };
    }

    case 'FISH_IDLE': {
      const next = new Map(state.fishStates);
      next.delete(action.fishId);
      return { ...state, fishStates: next };
    }

    case 'REMOVE_PARTICLE': {
      return {
        ...state,
        particles: state.particles.map((p) =>
          p.id === action.particleId ? { ...p, eaten: true } : p,
        ),
      };
    }

    case 'RESET':
      return {
        phase: 'IDLE',
        particles: [],
        fishStates: new Map(),
        startedAt: null,
      };

    default:
      return state;
  }
}

const initialState: FeedingState = {
  phase: 'IDLE',
  particles: [],
  fishStates: new Map(),
  startedAt: null,
};

// --- Context ---

interface FeedingContextValue {
  state: FeedingState;
  dispatch: React.Dispatch<FeedingAction>;
  startFeeding: (particles: Array<{ id: string; x: number; y: number }>) => void;
}

const FeedingContext = createContext<FeedingContextValue | null>(null);

export function FeedingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(feedingReducer, initialState);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  const startFeeding = useCallback(
    (particles: Array<{ id: string; x: number; y: number }>) => {
      clearTimers();
      dispatch({ type: 'START_FEEDING', particles });

      let delay = 0;

      // HUNGRY → SEEKING
      delay += PHASE_DURATIONS.HUNGRY;
      timersRef.current.push(
        setTimeout(() => {
          dispatch({ type: 'SET_PHASE', phase: 'SEEKING' });
        }, delay),
      );

      // SEEKING → EATING
      delay += PHASE_DURATIONS.SEEKING;
      timersRef.current.push(
        setTimeout(() => {
          dispatch({ type: 'SET_PHASE', phase: 'EATING' });
        }, delay),
      );

      // EATING → FULL
      delay += PHASE_DURATIONS.EATING;
      timersRef.current.push(
        setTimeout(() => {
          dispatch({ type: 'SET_PHASE', phase: 'FULL' });
        }, delay),
      );

      // FULL → RESET (back to IDLE)
      delay += PHASE_DURATIONS.FULL;
      timersRef.current.push(
        setTimeout(() => {
          dispatch({ type: 'RESET' });
        }, delay),
      );
    },
    [clearTimers],
  );

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

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
 * Get CSS class for a specific fish based on its individual feeding phase.
 */
export function getFishFeedingClass(
  fishId: string,
  feedingState: FeedingState,
): string | null {
  const fs = feedingState.fishStates.get(fishId);
  if (!fs) return null;

  switch (fs.phase) {
    case 'seeking':
      return 'fish-swim-fast';
    case 'eating':
      return 'fish-eating';
    case 'full':
      return 'fish-done';
    default:
      return null;
  }
}

/**
 * Determine if a fish should detect food based on distance.
 */
export function isFishNearFood(
  fishX: number,
  fishY: number,
  particles: FoodParticle[],
  threshold = 50, // pixels
): FoodParticle | null {
  const active = particles.filter((p) => !p.eaten);
  for (const p of active) {
    const dx = fishX - p.x;
    const dy = fishY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < threshold) return p;
  }
  return null;
}

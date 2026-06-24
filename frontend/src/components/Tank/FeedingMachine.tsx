'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from 'react';

/**
 * v6.0 Feeding State Machine
 *
 * Per-fish independent state machines:
 *   IDLE → HUNGRY → SEEKING → EATING → FULL → IDLE
 *
 * Food particles drop from top (CSS @keyframes food-fall, 2s).
 * Detection radius: 50px.
 * Each fish transitions independently.
 */

// ---- Types ----

/** Independent per-fish feeding phase */
export type FishFeedingPhase = 'IDLE' | 'HUNGRY' | 'SEEKING' | 'EATING' | 'FULL';

/** A single food particle descending in the tank */
export interface FoodParticle {
  id: string;
  x: number; // px (from left)
  y: number; // px (from top) — final resting position after fall
  /** Horizontal drift during fall */
  driftX: number; // px offset for CSS animation
}

/** Per-fish feeding state */
export interface FishFeedingState {
  phase: FishFeedingPhase;
  /** Target food particle this fish is seeking (if SEEKING/EATING) */
  targetParticleId: string | null;
  /** When this phase started (performance.now ms) */
  phaseStartedAt: number;
}

/** Global feeding state */
interface FeedingMachineState {
  /** Food particles currently in the tank */
  particles: FoodParticle[];
  /** Per-fish feeding states */
  fishStates: Map<string, FishFeedingState>;
  /** Is the machine currently running? */
  isActive: boolean;
}

// ---- Phase durations (ms) ----
const PHASE_DURATIONS: Record<Exclude<FishFeedingPhase, 'IDLE'>, number> = {
  HUNGRY: 300,    // food drops into view
  SEEKING: 2000,  // fish has time to swim toward food (max)
  EATING: 1500,   // mouth-open animation
  FULL: 2000,     // sink + bubble
};

const DETECTION_RADIUS_PX = 50;

// ---- Actions ----

type FeedingAction =
  | { type: 'TRIGGER_FEEDING'; particles: FoodParticle[]; fishIds: string[] }
  | { type: 'FISH_TRANSITION'; fishId: string; phase: FishFeedingPhase; targetParticleId?: string | null }
  | { type: 'CLEAR_PARTICLES' }
  | { type: 'RESET' };

// ---- Reducer ----

function createInitialState(): FeedingMachineState {
  return {
    particles: [],
    fishStates: new Map(),
    isActive: false,
  };
}

function feedingReducer(
  state: FeedingMachineState,
  action: FeedingAction,
): FeedingMachineState {
  switch (action.type) {
    case 'TRIGGER_FEEDING': {
      const now = performance.now();
      const nextFishStates = new Map(state.fishStates);

      for (const fishId of action.fishIds) {
        nextFishStates.set(fishId, {
          phase: 'HUNGRY',
          targetParticleId: null,
          phaseStartedAt: now,
        });
      }

      return {
        particles: action.particles,
        fishStates: nextFishStates,
        isActive: true,
      };
    }

    case 'FISH_TRANSITION': {
      const nextFishStates = new Map(state.fishStates);
      nextFishStates.set(action.fishId, {
        phase: action.phase,
        targetParticleId: action.targetParticleId ?? state.fishStates.get(action.fishId)?.targetParticleId ?? null,
        phaseStartedAt: performance.now(),
      });
      return {
        ...state,
        fishStates: nextFishStates,
      };
    }

    case 'CLEAR_PARTICLES':
      return {
        ...state,
        particles: [],
      };

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

// ---- Context ----

interface FeedingContextValue {
  state: FeedingMachineState;
  /** Trigger a feeding event. Creates particles and puts fish into HUNGRY. */
  triggerFeeding: (count?: number, fishIds?: string[]) => void;
  /** Called by physics engine when a SEEKING fish gets close enough to food */
  onFishReachedFood: (fishId: string) => void;
  /** Get CSS class for a fish based on its feeding phase */
  getFishFeedingClass: (fishId: string) => string | null;
}

const FeedingContext = createContext<FeedingContextValue | null>(null);

// ---- Provider ----

export function FeedingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(feedingReducer, undefined, createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Generate food particles
  const generateParticles = useCallback(
    (count: number, containerW: number, containerH: number): FoodParticle[] => {
      const particles: FoodParticle[] = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          id: `food-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          x: 30 + Math.random() * (containerW - 60), // 30px margin from edges
          y: 40 + Math.random() * (containerH - 80), // land in middle-to-bottom area
          driftX: (Math.random() - 0.5) * 20,
        });
      }
      return particles;
    },
    [],
  );

  const triggerFeeding = useCallback(
    (count = 5, fishIds?: string[]) => {
      // Default dimensions if called outside tank context
      const particles = generateParticles(count, 600, 280);
      const allFishIds = fishIds ?? [];
      dispatch({ type: 'TRIGGER_FEEDING', particles, fishIds: allFishIds });
    },
    [generateParticles],
  );

  // Auto-advance phases with timers
  useEffect(() => {
    if (!state.isActive) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const [fishId, fs] of state.fishStates) {
      if (fs.phase === 'HUNGRY') {
        const elapsed = performance.now() - fs.phaseStartedAt;
        const remaining = Math.max(0, PHASE_DURATIONS.HUNGRY - elapsed);
        timers.push(
          setTimeout(() => {
            // Transition to SEEKING — assign nearest food particle
            const s = stateRef.current;
            const closest = s.particles[0] ?? null;
            const targetId = closest?.id ?? null;
            dispatch({
              type: 'FISH_TRANSITION',
              fishId,
              phase: 'SEEKING',
              targetParticleId: targetId,
            });
          }, remaining),
        );
      }

      if (fs.phase === 'EATING') {
        const elapsed = performance.now() - fs.phaseStartedAt;
        const remaining = Math.max(0, PHASE_DURATIONS.EATING - elapsed);
        timers.push(
          setTimeout(() => {
            dispatch({ type: 'FISH_TRANSITION', fishId, phase: 'FULL' });
          }, remaining),
        );
      }

      if (fs.phase === 'FULL') {
        const elapsed = performance.now() - fs.phaseStartedAt;
        const remaining = Math.max(0, PHASE_DURATIONS.FULL - elapsed);
        timers.push(
          setTimeout(() => {
            dispatch({ type: 'FISH_TRANSITION', fishId, phase: 'IDLE' });
          }, remaining),
        );
      }
    }

    // Clean up food particles after all fish are done
    const allDone = state.particles.length > 0 &&
      [...state.fishStates.values()].every(
        (fs) => fs.phase === 'IDLE' || fs.phase === 'FULL',
      );

    if (allDone && state.particles.length > 0) {
      // Small delay then clear
      timers.push(
        setTimeout(() => {
          dispatch({ type: 'CLEAR_PARTICLES' });
        }, 500),
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [state.isActive, state.fishStates, state.particles.length]);

  const onFishReachedFood = useCallback((fishId: string) => {
    const fs = stateRef.current.fishStates.get(fishId);
    if (!fs || fs.phase !== 'SEEKING') return;
    dispatch({ type: 'FISH_TRANSITION', fishId, phase: 'EATING' });
  }, []);

  const getFishFeedingClass = useCallback(
    (fishId: string): string | null => {
      const fs = state.fishStates.get(fishId);
      if (!fs) return null;

      switch (fs.phase) {
        case 'IDLE':
          return null;
        case 'HUNGRY':
          return 'fish-hungry'; // rapid wiggle
        case 'SEEKING':
          return 'fish-seeking'; // fast dash
        case 'EATING':
          return 'fish-eating'; // mouth chomp
        case 'FULL':
          return 'fish-full'; // sink + bubble
        default:
          return null;
      }
    },
    [state.fishStates],
  );

  return (
    <FeedingContext.Provider
      value={{ state, triggerFeeding, onFishReachedFood, getFishFeedingClass }}
    >
      {children}
    </FeedingContext.Provider>
  );
}

// ---- Hook ----

export function useFeeding() {
  const ctx = useContext(FeedingContext);
  if (!ctx)
    throw new Error('useFeeding must be used within a FeedingProvider');
  return ctx;
}

/**
 * Check if a fish is within detection radius of any food particle.
 */
export function isFishNearFood(
  fishX: number,
  fishY: number,
  particles: FoodParticle[],
  radius = DETECTION_RADIUS_PX,
): FoodParticle | null {
  for (const p of particles) {
    const dx = p.x - fishX;
    const dy = p.y - fishY;
    if (Math.sqrt(dx * dx + dy * dy) < radius) {
      return p;
    }
  }
  return null;
}

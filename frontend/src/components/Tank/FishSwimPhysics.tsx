'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Fish } from '@/lib/api';

// ---- Types ----

export interface FishPosition {
  x: number;
  y: number;
  direction: 'left' | 'right';
}

interface InternalFishState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: 'left' | 'right';
  seeded: boolean;
}

export interface FeedingPhase {
  id: string;
  phase: 'IDLE' | 'HUNGRY' | 'SEEKING' | 'EATING' | 'FULL';
  /** Target food particle position (in px, relative to tank) */
  targetX?: number;
  targetY?: number;
  /** Timestamp when phase started */
  phaseStartedAt: number;
}

export interface FoodParticle {
  id: string;
  x: number; // px
  y: number; // px
}

const BASE_SPEED = 60; // px/s
const BOUNDARY_MARGIN = 20; // px
const ANGLE_PERTURBATION = Math.PI / 6; // ±30°

/**
 * rAF-based fish swim physics engine.
 * Returns a Map<fishId, FishPosition> updated ~20 times/sec.
 *
 * Optional feeding integration:
 * - `feedingPhases`: per-fish feeding phase map
 * - `foodParticles`: current food particles
 * - `onFishReachedFood`: called when fish in SEEKING gets within 50px of food target
 */
export function useFishSwimPhysics(
  fishList: Fish[],
  containerWidth: number,
  containerHeight: number,
  feedingPhases?: Map<string, FeedingPhase>,
  foodParticles?: FoodParticle[],
  onFishReachedFood?: (fishId: string) => void,
): Map<string, FishPosition> {
  // Mutable physics state — never triggers re-render
  const physicsRef = useRef<Map<string, InternalFishState>>(new Map());
  // Snapshot for React rendering
  const [positions, setPositions] = useState<
    Map<string, FishPosition>
  >(new Map());

  // Stable refs for values that change every render
  const fishListRef = useRef(fishList);
  fishListRef.current = fishList;
  const dimsRef = useRef({ w: containerWidth, h: containerHeight });
  dimsRef.current = { w: containerWidth, h: containerHeight };
  const feedingRef = useRef(feedingPhases);
  feedingRef.current = feedingPhases;
  const foodRef = useRef(foodParticles);
  foodRef.current = foodParticles;
  const onReachedRef = useRef(onFishReachedFood);
  onReachedRef.current = onFishReachedFood;

  // Seed new fish / remove dead fish
  const seedFish = useCallback(() => {
    const current = physicsRef.current;
    const fishIds = new Set(fishListRef.current.map((f) => f.id));
    const { w, h } = dimsRef.current;

    // Remove fish no longer in list
    for (const id of current.keys()) {
      if (!fishIds.has(id)) current.delete(id);
    }

    // Seed new fish
    for (const fish of fishListRef.current) {
      if (current.has(fish.id)) continue;
      const angle = Math.random() * Math.PI * 2;
      const spd = BASE_SPEED * 0.5; // start slower
      current.set(fish.id, {
        x: BOUNDARY_MARGIN + Math.random() * (w - BOUNDARY_MARGIN * 2),
        y: BOUNDARY_MARGIN + Math.random() * (h - BOUNDARY_MARGIN * 2),
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        direction: Math.cos(angle) < 0 ? 'left' : 'right',
        seeded: true,
      });
    }
  }, []);

  // rAF loop
  useEffect(() => {
    seedFish();

    let rafId: number;
    let lastTime = 0;
    let frameCount = 0;

    const tick = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const dtRaw = (time - lastTime) / 1000;
      const dt = Math.min(dtRaw, 0.1); // cap at 100ms to avoid spiral of death
      lastTime = time;
      frameCount++;

      const { w, h } = dimsRef.current;
      const states = physicsRef.current;
      const feedMap = feedingRef.current;
      const particles = foodRef.current;
      const onReached = onReachedRef.current;

      // Build quick fish lookup for mood
      const fishById = new Map(fishListRef.current.map((f) => [f.id, f]));

      for (const [id, s] of states) {
        const fish = fishById.get(id);
        if (!fish) continue;

        // Mood: derived from health + nutrition (0-100)
        const mood = (fish.health + fish.nutrition) / 2;

        // ---- Feeding override: bias toward food during SEEKING ----
        const feedPhase = feedMap?.get(id);
        let targetVx: number | undefined;
        let targetVy: number | undefined;

        if (feedPhase && feedPhase.phase === 'SEEKING' && feedPhase.targetX != null && feedPhase.targetY != null) {
          const dx = feedPhase.targetX - s.x;
          const dy = feedPhase.targetY - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 50) {
            // Close enough — notify
            onReached?.(id);
            // Still keep swimming but don't override velocity
          } else {
            // Steer toward food
            const seekSpeed = BASE_SPEED * 1.5 * (mood / 100);
            targetVx = (dx / dist) * seekSpeed;
            targetVy = (dy / dist) * seekSpeed;
          }
        }

        if (targetVx != null && targetVy != null) {
          // Blend toward target velocity (smooth steering)
          const blend = 0.15;
          s.vx = s.vx * (1 - blend) + targetVx * blend;
          s.vy = s.vy * (1 - blend) + targetVy * blend;
        } else {
          // Normal swim: perturb angle ±30° each frame
          const currentAngle = Math.atan2(s.vy, s.vx);
          const perturb = (Math.random() - 0.5) * ANGLE_PERTURBATION * 2;
          const newAngle = currentAngle + perturb * dt * 3; // dt-scaled for frame-rate independence

          const speed = BASE_SPEED * (mood / 100);
          s.vx = Math.cos(newAngle) * speed;
          s.vy = Math.sin(newAngle) * speed;
        }

        // Update position
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        // Boundary collision with mirror reflection + random scatter
        if (s.x < BOUNDARY_MARGIN) {
          s.x = BOUNDARY_MARGIN;
          s.vx = Math.abs(s.vx);
          s.vy += (Math.random() - 0.5) * BASE_SPEED * 0.3;
        } else if (s.x > w - BOUNDARY_MARGIN) {
          s.x = w - BOUNDARY_MARGIN;
          s.vx = -Math.abs(s.vx);
          s.vy += (Math.random() - 0.5) * BASE_SPEED * 0.3;
        }

        if (s.y < BOUNDARY_MARGIN) {
          s.y = BOUNDARY_MARGIN;
          s.vy = Math.abs(s.vy);
          s.vx += (Math.random() - 0.5) * BASE_SPEED * 0.3;
        } else if (s.y > h - BOUNDARY_MARGIN) {
          s.y = h - BOUNDARY_MARGIN;
          s.vy = -Math.abs(s.vy);
          s.vx += (Math.random() - 0.5) * BASE_SPEED * 0.3;
        }

        // Clamp velocity magnitude to prevent explosion
        const mag = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        const maxSpeed = BASE_SPEED * 2;
        if (mag > maxSpeed) {
          s.vx = (s.vx / mag) * maxSpeed;
          s.vy = (s.vy / mag) * maxSpeed;
        }

        // Direction
        s.direction = s.vx < -5 ? 'left' : s.vx > 5 ? 'right' : s.direction;
      }

      // Update React state every 3 frames (~20 fps visual updates)
      if (frameCount % 3 === 0) {
        const snapshot = new Map<string, FishPosition>();
        for (const [id, s] of states) {
          snapshot.set(id, { x: s.x, y: s.y, direction: s.direction });
        }
        setPositions(snapshot);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [seedFish]);

  return positions;
}

/**
 * Get the inline CSS transform for a fish position.
 * The tank container is the positioning context (relative).
 */
export function fishPositionStyle(
  pos: FishPosition | undefined,
  fishSize = 64,
): React.CSSProperties {
  if (!pos) {
    return {
      position: 'absolute',
      visibility: 'hidden',
      willChange: 'transform',
    };
  }

  return {
    position: 'absolute',
    left: 0,
    top: 0,
    width: fishSize,
    height: Math.round(fishSize * 0.6),
    transform: `translate(${pos.x - fishSize / 2}px, ${pos.y - fishSize * 0.3}px) scaleX(${pos.direction === 'left' ? 1 : -1})`,
    willChange: 'transform',
  };
}

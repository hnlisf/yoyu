'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type { Fish } from '@/lib/api';
import { FishAvatar } from '@/components/fish';
import { slugToVariant } from '@/components/fish/types';
import { useFishSwimPhysics, fishPositionStyle, type FeedingPhase } from './FishSwimPhysics';
import { FeedingProvider, useFeeding, type FoodParticle } from './FeedingMachine';
import './tank.css';
import './tank-bg.css';

// ---- Props ----

interface TankStageProps {
  fishList: Fish[];
  onFishClick?: (fish: Fish) => void;
  weatherCode?: number;
  /** Ref that receives a triggerFeeding(count, fishIds) function for external control */
  feedRef?: React.MutableRefObject<
    ((count?: number, fishIds?: string[]) => void) | null
  >;
}

/**
 * v6.0 Tank stage — uses rAF physics engine (FishSwimPhysics) instead of CSS offset-path.
 * Integrates FeedingMachine for per-fish feeding state management.
 */
export function TankStage({ fishList, onFishClick, weatherCode, feedRef }: TankStageProps) {
  return (
    <FeedingProvider>
      <TankStageInner
        fishList={fishList}
        onFishClick={onFishClick}
        weatherCode={weatherCode}
        feedRef={feedRef}
      />
    </FeedingProvider>
  );
}

function TankStageInner({ fishList, onFishClick, weatherCode, feedRef }: TankStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDims, setContainerDims] = useState({ w: 600, h: 280 });

  const { state: feedingState, triggerFeeding, onFishReachedFood, getFishFeedingClass } =
    useFeeding();

  // Measure container dimensions on mount/resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      setContainerDims({ w: el.clientWidth, h: el.clientHeight });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build per-fish feeding phase map for physics engine
  const feedingPhases = useMemo(() => {
    const map = new Map<string, FeedingPhase>();
    for (const [fishId, fs] of feedingState.fishStates) {
      if (fs.phase === 'IDLE') continue;
      const particle = fs.targetParticleId
        ? feedingState.particles.find((p) => p.id === fs.targetParticleId)
        : null;
      map.set(fishId, {
        id: fishId,
        phase: fs.phase,
        targetX: particle?.x,
        targetY: particle?.y,
        phaseStartedAt: fs.phaseStartedAt,
      });
    }
    return map;
  }, [feedingState.fishStates, feedingState.particles]);

  // Physics engine
  const positions = useFishSwimPhysics(
    fishList,
    containerDims.w,
    containerDims.h,
    feedingPhases,
    feedingState.particles,
    onFishReachedFood,
  );

  // Expose triggerFeeding via feedRef for parent components
  useEffect(() => {
    if (feedRef) {
      feedRef.current = (count?: number, fishIds?: string[]) => {
        triggerFeeding(
          count ?? 5,
          fishIds ?? fishList.map((f) => f.id),
        );
      };
    }
    return () => {
      if (feedRef) feedRef.current = null;
    };
  }, [feedRef, triggerFeeding, fishList]);

  // Derive tank background class from weather code
  const bgClass = getWeatherBgClass(weatherCode);

  return (
    <div
      ref={containerRef}
      className={`swim-stage glass-card ${bgClass}`}
      style={{ minHeight: 280, position: 'relative', overflow: 'hidden' }}
    >
      {/* Deep-sea gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.08] to-deep/40 pointer-events-none z-0" />

      {/* Decorative bubbles */}
      <Bubble delay={0} left="8%" />
      <Bubble delay={2} left="75%" />
      <Bubble delay={4} left="33%" />
      <Bubble delay={1.5} left="90%" />

      {/* Food particles during feeding */}
      {feedingState.particles.map((p) => (
        <FoodParticleElement key={p.id} particle={p} />
      ))}

      {/* Fish — positioned by physics engine */}
      {fishList.length > 0 ? (
        fishList.map((f) => {
          const pos = positions.get(f.id);
          const feedingClass = getFishFeedingClass(f.id);
          const variant = slugToVariant(f.species?.name ?? f.species?.id);

          return (
            <div
              key={f.id}
              className="fish-physics-wrapper"
              style={fishPositionStyle(pos)}
              onClick={() => onFishClick?.(f)}
            >
              <span className={feedingClass || undefined}>
                <FishAvatar
                  variant={variant}
                  stage={f.stage}
                  size={64}
                  animated={false}
                />
              </span>
              <p className="text-[9px] text-text-primary mt-0.5 font-light drop-shadow text-center truncate max-w-[80px]">
                {f.name || f.stage}
              </p>
            </div>
          );
        })
      ) : (
        <div className="relative z-10 flex items-center justify-center py-16 text-text-secondary text-sm">
          还没有鱼，快去添加吧~
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----

/** Decorative rising bubble */
function Bubble({ delay, left }: { delay: number; left: string }) {
  return (
    <div
      className="absolute bottom-4 w-2 h-2 rounded-full bg-white/40 animate-bubble pointer-events-none z-0"
      style={{ left, animationDelay: `${delay}s` }}
      aria-hidden
    />
  );
}

/** Food particle with CSS fall animation */
function FoodParticleElement({ particle }: { particle: FoodParticle }) {
  return (
    <div
      className="food-particle-v6"
      style={{
        left: `${particle.x}px`,
        '--drift-x': `${particle.driftX}px`,
        '--target-y': `${particle.y}px`,
      } as React.CSSProperties}
    />
  );
}

// ---- Helpers ----

function getWeatherBgClass(code?: number): string {
  if (code == null) return '';
  if (code >= 100 && code <= 150) return 'tank-bg--sunny';
  if (code >= 151 && code <= 213) return 'tank-bg--cloudy';
  if (code >= 300 && code <= 399) return 'tank-bg--rainy';
  if (code >= 400 && code <= 499) return 'tank-bg--snowy';
  return '';
}

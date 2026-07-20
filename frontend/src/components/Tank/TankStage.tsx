'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Link } from '@/i18n/routing';
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
  // v9.1 REQ-3: nickname visibility — only one visible at a time
  const [visibleNicknameId, setVisibleNicknameId] = useState<string | null>(null);
  const nicknameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // v9.1 REQ-3: handle fish card click for nickname toggle
  const handleFishCardClick = useCallback((fish: Fish) => {
    if (nicknameTimerRef.current) {
      clearTimeout(nicknameTimerRef.current);
      nicknameTimerRef.current = null;
    }
    // If clicking same fish that's already visible, hide it
    if (visibleNicknameId === fish.id) {
      setVisibleNicknameId(null);
      onFishClick?.(fish);
      return;
    }
    setVisibleNicknameId(fish.id);
    nicknameTimerRef.current = setTimeout(() => {
      setVisibleNicknameId(null);
      nicknameTimerRef.current = null;
    }, 2500);
    onFishClick?.(fish);
  }, [visibleNicknameId, onFishClick]);

  const handleStageClick = useCallback((e: React.MouseEvent) => {
    // Only hide if clicking the background (not a fish)
    if ((e.target as HTMLElement).closest('.fish-physics-wrapper')) return;
    if (nicknameTimerRef.current) {
      clearTimeout(nicknameTimerRef.current);
      nicknameTimerRef.current = null;
    }
    setVisibleNicknameId(null);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (nicknameTimerRef.current) clearTimeout(nicknameTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`swim-stage glass-card ${bgClass}`}
      style={{ position: 'relative', overflow: 'hidden' }}
      onClick={handleStageClick}
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
          const showNickname = visibleNicknameId === f.id;

          return (
            <React.Fragment key={f.id}>
              <div
                className="fish-physics-wrapper"
                style={fishPositionStyle(pos)}
                onClick={(e) => { e.stopPropagation(); handleFishCardClick(f); }}
              >
                <span className={feedingClass || undefined}>
                  <FishAvatar
                    variant={variant}
                    visualVariant={f.species?.visualVariant}
                    stage={f.stage}
                    size={64}
                    animated={false}
                  />
                </span>
              </div>
              {/* v9.1 REQ-3: click to show nickname, auto-hide after 2.5s */}
              {/* Moved outside fish-physics-wrapper to avoid scaleX inheritance (BUG-V10.1.3-6) */}
              {pos && (
                <p
                  className={`text-[9px] text-text-primary mt-0.5 font-light drop-shadow text-center whitespace-normal break-words leading-tight transition-opacity duration-200 ${showNickname ? 'opacity-100' : 'opacity-0'}`}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y - 32,
                    transform: 'translateX(-50%)',
                    pointerEvents: showNickname ? 'auto' : 'none',
                  }}
                  onClick={(e) => { e.stopPropagation(); handleFishCardClick(f); }}
                >
                  {f.name || f.stage}
                </p>
              )}
            </React.Fragment>
          );
        })
      ) : (
        <Link href="/species" className="relative z-10 flex items-center justify-center py-16 text-text-secondary text-sm hover:text-accent transition">
          还没有鱼，快去添加吧~
        </Link>
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

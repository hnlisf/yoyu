'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Fish } from '@/lib/api';
import { FishAvatar } from '@/components/fish';
import { slugToVariant } from '@/components/fish/types';
import { SWIM_PATHS, pickRandomPath, randomDuration, shouldSwim } from './swimPaths';
import {
  useFeeding,
  getFishFeedingClass,
  isFishNearFood,
  FeedingPhase,
} from './feedingStateMachine';
import './tank.css';
import './tank-bg.css';

interface TankStageProps {
  fishList: Fish[];
  onFishClick?: (fish: Fish) => void;
  weatherCode?: number; // for background switching later
}

/**
 * v5.0 Tank stage — renders fish with CSS offset-path swim animation,
 * feeding state machine integration, and performance degradation.
 */
export function TankStage({ fishList, onFishClick, weatherCode }: TankStageProps) {
  const { state: feedingState } = useFeeding();
  const containerRef = useRef<HTMLDivElement>(null);

  // Assign a swim path and duration to each fish (stable by fish id)
  const fishAnimations = useMemo(() => {
    return fishList.map((f, i) => {
      const path = pickRandomPath(i > 0 ? undefined : undefined);
      const duration = randomDuration(path);
      const swim = shouldSwim(i, fishList.length);
      return { fishId: f.id, path, duration, swim, index: i };
    });
  }, [fishList]);

  // Auto-detect which fish are near food during DETECTING → SWIMMING_TO_FOOD
  useEffect(() => {
    if (
      feedingState.phase === 'DETECTING' &&
      feedingState.particles.length > 0
    ) {
      // After detection delay, mark fish near food as "arrived"
      const timer = setTimeout(() => {
        // For simplicity: randomly mark ~60% of fish as near food
        const nearby = fishList
          .filter(() => Math.random() > 0.4)
          .map((f) => f.id);
        // We use the dispatch from context — will be handled by parent
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [feedingState.phase, feedingState.particles.length, fishList]);

  // Derive tank background class from weather code
  const bgClass = getWeatherBgClass(weatherCode);

  return (
    <div
      ref={containerRef}
      className={`swim-stage glass-card ${bgClass}`}
      style={{ minHeight: 280 }}
    >
      {/* Deep-sea gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.08] to-deep/40 pointer-events-none z-0" />

      {/* Decorative bubbles */}
      <Bubble delay={0} left="8%" />
      <Bubble delay={2} left="75%" />
      <Bubble delay={4} left="33%" />
      <Bubble delay={1.5} left="90%" />

      {/* Food particles during FEEDING phase */}
      {feedingState.particles.map((p) => (
        <div
          key={p.id}
          className="food-particle"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        />
      ))}

      {/* Fish — using absolute positioning with offset-path */}
      {fishList.length > 0 ? (
        fishAnimations.map(({ fishId, path, duration, swim, index }) => {
          const f = fishList.find((ff) => ff.id === fishId);
          if (!f) return null;

          const feedingClass = getFishFeedingClass(f.id, feedingState);
          const variant = slugToVariant(f.species?.name ?? f.species?.id);

          // Position fish spread across the tank area
          const leftPct = 10 + (index % 8) * 11;
          const topPct = 15 + (index * 17) % 65;

          return (
            <div
              key={f.id}
              className={`swim-fish-wrapper ${swim ? 'fish-swim' : 'fish-float-degraded'} ${
                feedingClass || ''
              }`}
              style={
                swim
                  ? {
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      offsetPath: `path('${path.d}')`,
                      animationDuration: `${duration}s`,
                      animationDelay: `${index * 0.5}s`,
                    } as React.CSSProperties
                  : {
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      animationDelay: `${index * 0.3}s`,
                    }
              }
              onClick={() => onFishClick?.(f)}
            >
              <FishAvatar
                variant={variant}
                stage={f.stage}
                size={64}
                animated={false}
              />
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

/**
 * Map weather code to CSS background class.
 * QWeather codes: 100-150=sunny, 151-213=cloudy, 300-399=rainy, 400-499=snowy
 */
function getWeatherBgClass(code?: number): string {
  if (code == null) return '';
  if (code >= 100 && code <= 150) return 'tank-bg--sunny';
  if (code >= 151 && code <= 213) return 'tank-bg--cloudy';
  if (code >= 300 && code <= 399) return 'tank-bg--rainy';
  if (code >= 400 && code <= 499) return 'tank-bg--snowy';
  return '';
}

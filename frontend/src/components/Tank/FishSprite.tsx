'use client';

import React from 'react';
import { FishAvatar } from '@/components/fish';
import type { FishVariant, FishStage } from '@/components/fish/types';

interface FishSpriteProps {
  x: number;        // pixel position within tank
  y: number;        // pixel position within tank
  direction: 1 | -1; // 1 = facing right, -1 = facing left
  variant: FishVariant;
  stage: FishStage;
  size?: number;
  onClick?: () => void;
  /** v10.1.3-w3b: visualVariant for custom species rendering */
  visualVariant?: { color: string; pattern: string; body: string };
}

/**
 * Renders a single fish SVG at the given position using absolute positioning.
 * Uses transform for GPU-accelerated movement.
 * Flipped via scaleX based on direction.
 */
export function FishSprite({
  x,
  y,
  direction,
  variant,
  stage,
  size = 64,
  onClick,
  visualVariant,
}: FishSpriteProps) {
  return (
    <div
      className="absolute cursor-pointer"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${x}px, ${y}px, 0) scaleX(${direction})`,
        willChange: 'transform',
        pointerEvents: 'auto',
      }}
      onClick={onClick}
    >
      <FishAvatar
        variant={variant}
        visualVariant={visualVariant}
        stage={stage}
        size={size}
        animated={false}
      />
    </div>
  );
}

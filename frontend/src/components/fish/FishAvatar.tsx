'use client';

import type { FishVariant, FishStage } from './types';
import { GoldFishSVG } from './GoldFishSVG';
import { GuppyFishSVG } from './GuppyFishSVG';
import { TetraFishSVG } from './TetraFishSVG';
import { BettaFishSVG } from './BettaFishSVG';
import { AngelFishSVG } from './AngelFishSVG';

interface FishAvatarProps {
  variant: FishVariant;
  size?: number;
  stage?: FishStage;
  animated?: boolean;
  className?: string;
}

const COMPONENT: Record<FishVariant, React.ComponentType<{ size?: number; className?: string }>> = {
  goldfish: GoldFishSVG,
  guppy: GuppyFishSVG,
  tetra: TetraFishSVG,
  betta: BettaFishSVG,
  angel: AngelFishSVG,
};

/** Stage multiplier applied to the rendered size. Fry is 40%, adult 100%. */
const STAGE_SCALE: Record<FishStage, number> = {
  fry: 0.4,
  juvenile: 0.6,
  subadult: 0.8,
  adult: 1.0,
};

/**
 * Wrapper component that picks the right SVG for a variant and applies
 * stage + size + optional swim animation.
 */
export function FishAvatar({
  variant,
  size = 64,
  stage = 'adult',
  animated = true,
  className = '',
}: FishAvatarProps) {
  const Comp = COMPONENT[variant];
  const scaledSize = Math.round(size * STAGE_SCALE[stage]);
  return (
    <div
      className={`inline-block ${animated ? 'animate-swim' : ''} ${className}`}
      style={{ width: scaledSize, height: (scaledSize * 3) / 5 }}
      aria-label={`${variant} ${stage}`}
    >
      <Comp size={scaledSize} />
    </div>
  );
}

'use client';

import type { FishVariant, FishStage } from './types';
import { GoldFishSVG } from './GoldFishSVG';
import { KoiFishSVG } from './KoiFishSVG';
import { GuppyFishSVG } from './GuppyFishSVG';
import { TropicalFishSVG } from './TropicalFishSVG';
import { TetraFishSVG } from './TetraFishSVG';
import { CoryFishSVG } from './CoryFishSVG';
import { PlecoFishSVG } from './PlecoFishSVG';
import { OtocinclusFishSVG } from './OtocinclusFishSVG';
import { AngelFishSVG } from './AngelFishSVG';
import { BettaFishSVG } from './BettaFishSVG';
import { CustomFishSVG } from './CustomFishSVG';

interface FishAvatarProps {
  variant: FishVariant;
  size?: number;
  stage?: FishStage;
  animated?: boolean;
  className?: string;
  /** v10.1.3-w3b: visualVariant for custom species 5×5×5 rendering */
  visualVariant?: { color: string; pattern: string; body: string };
  nickname?: string;
}

const COMPONENT: Record<FishVariant, React.ComponentType<{ size?: number; className?: string }>> = {
  goldfish: GoldFishSVG,
  koi: KoiFishSVG,
  guppy: GuppyFishSVG,
  tropical: TropicalFishSVG,
  tetra: TetraFishSVG,
  cory: CoryFishSVG,
  pleco: PlecoFishSVG,
  otocinclus: OtocinclusFishSVG,
  angelfish: AngelFishSVG,
  betta: BettaFishSVG,
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
 *
 * v10.1.3-w3b: When visualVariant is provided, uses CustomFishSVG for
 * algorithmically-generated 5×5×5 visual differentiation.
 */
export function FishAvatar({
  variant,
  size = 64,
  stage = 'adult',
  animated = true,
  className = '',
  visualVariant,
  nickname,
}: FishAvatarProps) {
  const scaledSize = Math.round(size * STAGE_SCALE[stage]);
  const Comp = COMPONENT[variant];

  return (
    <div
      className={`inline-block ${animated ? 'animate-swim' : ''} ${className}`}
      style={{ width: scaledSize, height: (scaledSize * 3) / 5 }}
      aria-label={nickname ? `${nickname} (${variant} ${stage})` : `${variant} ${stage}`}
    >
      {visualVariant ? (
        <CustomFishSVG size={scaledSize} visualVariant={visualVariant} nickname={nickname} />
      ) : (
        <Comp size={scaledSize} />
      )}
    </div>
  );
}

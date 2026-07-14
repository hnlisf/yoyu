'use client';

import { useId } from 'react';

interface CustomFishSVGProps {
  size?: number;
  className?: string;
  /** visualVariant object: { color, pattern, body } — values are string names */
  visualVariant: { color: string; pattern: string; body: string };
  /** user-assigned nickname (shown as label) */
  nickname?: string;
}

// 5-color palette
const COLOR_MAP: Record<string, string> = {
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  blue: '#3B82F6',
  purple: '#A855F7',
};

// Backward compat: old 3-value names → closest 5-value
const COLOR_FALLBACK: Record<string, string> = {
  red: 'red',
  blue: 'blue',
  golden: 'yellow',
  orange: 'orange',
  yellow: 'yellow',
  purple: 'purple',
};

const PATTERN_FALLBACK: Record<string, string> = {
  solid: 'solid',
  spotted: 'spots',
  striped: 'stripe',
  stripe: 'stripe',
  spots: 'spots',
  scale: 'scale',
  gradient: 'gradient',
};

// Body shape: rx, ry for main ellipse (centered at 110, 60 on 200×120 viewBox)
const BODY_SHAPE: Record<string, { rx: number; ry: number }> = {
  slim: { rx: 40, ry: 18 },
  normal: { rx: 42, ry: 24 },
  plump: { rx: 38, ry: 32 },
  elongated: { rx: 50, ry: 20 },
  round: { rx: 34, ry: 32 },
};

const BODY_FALLBACK: Record<string, string> = {
  slim: 'slim',
  round: 'plump',
  elongated: 'elongated',
  normal: 'normal',
  plump: 'plump',
};

// Pattern color derivations (lighter/darker variants of base color)
function deriveColors(hex: string) {
  return {
    base: hex,
    light: hex + '99',  // 60% opacity
    dark: hex + 'CC',   // 80% opacity for stripes etc
  };
}

/**
 * Dynamic SVG fish rendered algorithmically from visualVariant.
 * 5 colors × 5 patterns × 5 body shapes = 125 combinations.
 *
 * Fallback: old 3-value names (red/blue/golden, solid/spotted/striped, slim/round/elongated)
 * map to closest 5-value equivalent.
 */
export function CustomFishSVG({ size, className, visualVariant, nickname }: CustomFishSVGProps) {
  const uid = useId().replace(/:/g, '_');

  // Resolve color — support both new 5-value and old 3-value names
  const rawColor = visualVariant.color?.toLowerCase() ?? 'blue';
  const colorKey = COLOR_FALLBACK[rawColor] ?? rawColor;
  const hex = COLOR_MAP[colorKey] ?? '#3B82F6';
  const c = deriveColors(hex);

  // Resolve pattern — support both new 5-value and old 3-value names
  const rawPattern = visualVariant.pattern?.toLowerCase() ?? 'solid';
  const patternKey = PATTERN_FALLBACK[rawPattern] ?? rawPattern;

  // Resolve body
  const rawBody = visualVariant.body?.toLowerCase() ?? 'normal';
  const bodyKey = BODY_FALLBACK[rawBody] ?? rawBody;
  const shape = BODY_SHAPE[bodyKey] ?? BODY_SHAPE.normal;

  const bodyGrad = `cBody_${uid}`;
  const finGrad = `cFin_${uid}`;
  const stripePattern = `cStripe_${uid}`;
  const spotsPattern = `cSpots_${uid}`;
  const scalePattern = `cScale_${uid}`;
  const gradPattern = `cGrad_${uid}`;

  // Determine which pattern def to use
  const hasPattern = patternKey !== 'solid';
  const patternFill = hasPattern ? `url(#${patternKey === 'stripe' ? stripePattern : patternKey === 'spots' ? spotsPattern : patternKey === 'scale' ? scalePattern : gradPattern})` : `url(#${bodyGrad})`;

  return (
    <svg
      viewBox="0 0 200 120"
      width={size ?? '100%'}
      height={size ? undefined : '100%'}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label={nickname ? `Custom fish: ${nickname}` : 'Custom fish'}
    >
      <defs>
        {/* Body gradient — base color with highlight */}
        <radialGradient id={bodyGrad} cx="0.35" cy="0.35">
          <stop offset="0" stopColor={hex} stopOpacity="0.6" />
          <stop offset="0.4" stopColor={hex} />
          <stop offset="1" stopColor={c.dark} />
        </radialGradient>

        {/* Fin gradient */}
        <linearGradient id={finGrad} x1="0" x2="1">
          <stop offset="0" stopColor={hex} stopOpacity="0.9" />
          <stop offset="0.5" stopColor={hex} stopOpacity="0.5" />
          <stop offset="1" stopColor={hex} stopOpacity="0.15" />
        </linearGradient>

        {/* Stripe pattern — vertical stripes */}
        <pattern id={stripePattern} patternUnits="userSpaceOnUse" width="8" height="8">
          <rect width="8" height="8" fill={`url(#${bodyGrad})`} />
          <rect width="3" height="8" fill={c.dark} opacity="0.5" />
        </pattern>

        {/* Spots pattern — scattered dots */}
        <pattern id={spotsPattern} patternUnits="userSpaceOnUse" width="14" height="14">
          <rect width="14" height="14" fill={`url(#${bodyGrad})`} />
          <circle cx="7" cy="7" r="2.5" fill={c.dark} opacity="0.5" />
          <circle cx="3" cy="12" r="1.5" fill={c.dark} opacity="0.4" />
          <circle cx="11" cy="3" r="1.5" fill={c.dark} opacity="0.4" />
        </pattern>

        {/* Scale pattern — overlapping arcs */}
        <pattern id={scalePattern} patternUnits="userSpaceOnUse" width="10" height="10">
          <rect width="10" height="10" fill={`url(#${bodyGrad})`} />
          <path d="M 0 5 A 5 5 0 0 0 10 5" fill="none" stroke={c.dark} strokeWidth="0.8" opacity="0.4" />
          <path d="M 5 0 A 5 5 0 0 0 5 10" fill="none" stroke={c.dark} strokeWidth="0.8" opacity="0.35" />
        </pattern>

        {/* Gradient pattern — diagonal linear gradient overlay */}
        <linearGradient id={gradPattern} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hex} />
          <stop offset="0.3" stopColor={c.light} />
          <stop offset="0.6" stopColor={hex} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
      </defs>

      {/* Tail fin (3-layer for depth) — positioned relative to body */}
      <path d={`M ${110 - shape.rx} 60 Q ${110 - shape.rx - 30} 15 ${110 - shape.rx - 50} 35 Q ${110 - shape.rx - 55} 60 ${110 - shape.rx - 50} 85 Q ${110 - shape.rx - 30} 105 ${110 - shape.rx} 60 Z`} fill={`url(#${finGrad})`} />
      <path d={`M ${110 - shape.rx} 60 Q ${110 - shape.rx - 25} 25 ${110 - shape.rx - 43} 45 Q ${110 - shape.rx - 47} 60 ${110 - shape.rx - 43} 75 Q ${110 - shape.rx - 25} 95 ${110 - shape.rx} 60 Z`} fill={`url(#${finGrad})`} opacity="0.7" />
      <path d={`M ${110 - shape.rx} 60 Q ${110 - shape.rx - 20} 35 ${110 - shape.rx - 37} 52 Q ${110 - shape.rx - 40} 60 ${110 - shape.rx - 37} 68 Q ${110 - shape.rx - 20} 85 ${110 - shape.rx} 60 Z`} fill={`url(#${finGrad})`} opacity="0.4" />

      {/* Main body — ellipse with variant shape */}
      <ellipse cx="110" cy="60" rx={shape.rx} ry={shape.ry} fill={patternFill} />

      {/* Dorsal fin on top */}
      <path d={`M ${110 - shape.rx * 0.3} ${60 - shape.ry} Q 110 ${60 - shape.ry - 14} ${110 + shape.rx * 0.3} ${60 - shape.ry + 3}`} fill={hex} opacity="0.6" stroke={c.dark} strokeWidth="0.5" />

      {/* Belly highlight */}
      <ellipse cx={105} cy={60 + shape.ry * 0.2} rx={shape.rx * 0.55} ry={shape.ry * 0.35} fill="rgba(255,255,255,0.3)" />

      {/* Scale highlights */}
      <ellipse cx={95} cy={52} rx={shape.rx * 0.35} ry={shape.ry * 0.12} fill="rgba(255,255,255,0.15)" />
      <ellipse cx={100} cy={58} rx={shape.rx * 0.28} ry={shape.ry * 0.1} fill="rgba(255,255,255,0.12)" />

      {/* Eye — positioned on right side of body */}
      <circle cx={110 + shape.rx * 0.75} cy={60 - shape.ry * 0.25} r={shape.ry * 0.15} fill="white" stroke={c.dark} strokeWidth="0.5" />
      <circle cx={110 + shape.rx * 0.75} cy={60 - shape.ry * 0.25} r={shape.ry * 0.085} fill="#1a1a1a" />
      <circle cx={110 + shape.rx * 0.75 + 1} cy={60 - shape.ry * 0.25 - 1} r={shape.ry * 0.04} fill="white" />

      {/* Mouth */}
      <ellipse cx={110 + shape.rx} cy={60} rx={shape.ry * 0.08} ry={shape.ry * 0.06} fill={c.dark} opacity="0.6" />

      {/* Pectoral fin (bottom) */}
      <ellipse cx={125} cy={60 + shape.ry * 0.55} rx={shape.rx * 0.22} ry={shape.ry * 0.18} fill={hex} opacity="0.45" transform={`rotate(15 125 ${60 + shape.ry * 0.55})`} />

      {/* Nickname label (small, below fish) */}
      {nickname && (
        <text x="110" y={60 + shape.ry + 14} textAnchor="middle" fontSize="9" fill="#888" fontFamily="sans-serif">
          {nickname}
        </text>
      )}
    </svg>
  );
}

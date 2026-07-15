'use client';

import { useId } from 'react';

interface CustomFishSVGProps {
  size?: number;
  className?: string;
  /** visualVariant object: { color, pattern, body } — values are string names per Tomas §2.2 */
  visualVariant: { color: string; pattern: string; body: string };
  /** user-assigned nickname (shown as label) */
  nickname?: string;
}

// 5-color palette per Tomas §2.2: Red/Orange/Yellow/Green/Blue
const COLOR_MAP: Record<string, string> = {
  red: '#E74C3C',
  orange: '#E67E22',
  yellow: '#F1C40F',
  green: '#27AE60',
  blue: '#3498DB',
};

// Backward compat: old 3-value/5-value names → Tomas §2.2 spec
const COLOR_FALLBACK: Record<string, string> = {
  red: 'red',
  blue: 'blue',
  golden: 'yellow',
  orange: 'orange',
  yellow: 'yellow',
  green: 'green',
  purple: 'blue',
};

const PATTERN_FALLBACK: Record<string, string> = {
  solid: 'solid',
  spotted: 'spots',
  striped: 'stripe',
  stripe: 'stripe',
  spots: 'spots',
  scale: 'camouflage',
  gradient: 'gradient',
  camouflage: 'camouflage',
};

// Body shape: SVG path (viewBox 0 0 200 120, fish centered at 110,60)
// per Tomas §2.2: oval/diamond/streamlined/disc/elongated
const BODY_SHAPE: Record<string, string> = {
  oval:        'M70,60 Q110,48 150,60 Q110,72 70,60',
  diamond:     'M70,60 Q110,38 150,60 Q110,82 70,60',
  streamlined: 'M75,60 Q110,44 145,60 Q110,76 75,60',
  disc:        'M90,60 Q110,34 130,60 Q110,86 90,60',
  elongated:   'M60,60 Q110,46 160,60 Q110,74 60,60',
};

// Approximate rx/ry per body shape for positioning fins/eye/mouth
const BODY_METRICS: Record<string, { rx: number; ry: number }> = {
  oval:        { rx: 40, ry: 12 },
  diamond:     { rx: 40, ry: 22 },
  streamlined: { rx: 35, ry: 16 },
  disc:        { rx: 20, ry: 26 },
  elongated:   { rx: 50, ry: 14 },
};

const BODY_FALLBACK: Record<string, string> = {
  slim: 'oval',
  round: 'disc',
  normal: 'diamond',
  plump: 'streamlined',
  elongated: 'elongated',
  oval: 'oval',
  diamond: 'diamond',
  streamlined: 'streamlined',
  disc: 'disc',
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
 * v10.1.4: aligned with Tomas architecture §2.1-§2.2 spec.
 *
 * Fallback: old 3-value/5-value names map to closest Tomas spec equivalent.
 */
export function CustomFishSVG({ size, className, visualVariant, nickname }: CustomFishSVGProps) {
  const uid = useId().replace(/:/g, '_');

  // Resolve color — support both new 5-value and old 3-value names
  const rawColor = visualVariant.color?.toLowerCase() ?? 'blue';
  const colorKey = COLOR_FALLBACK[rawColor] ?? rawColor;
  const hex = COLOR_MAP[colorKey] ?? '#3498DB';
  const c = deriveColors(hex);

  // Resolve pattern — support both new 5-value and old 3-value names
  const rawPattern = visualVariant.pattern?.toLowerCase() ?? 'solid';
  const patternKey = PATTERN_FALLBACK[rawPattern] ?? rawPattern;

  // Resolve body
  const rawBody = visualVariant.body?.toLowerCase() ?? 'oval';
  const bodyKey = BODY_FALLBACK[rawBody] ?? rawBody;
  const bodyPath = BODY_SHAPE[bodyKey] ?? BODY_SHAPE.oval;
  const m = BODY_METRICS[bodyKey] ?? BODY_METRICS.oval;

  const bodyGrad = `cBody_${uid}`;
  const finGrad = `cFin_${uid}`;
  const stripePattern = `cStripe_${uid}`;
  const spotsPattern = `cSpots_${uid}`;
  const camouflagePattern = `cCamou_${uid}`;
  const gradPattern = `cGrad_${uid}`;

  // Determine which pattern def to use
  const hasPattern = patternKey !== 'solid';
  const patternFill = (() => {
    if (!hasPattern) return `url(#${bodyGrad})`;
    switch (patternKey) {
      case 'stripe': return `url(#${stripePattern})`;
      case 'spots': return `url(#${spotsPattern})`;
      case 'camouflage': return `url(#${camouflagePattern})`;
      case 'gradient': return `url(#${gradPattern})`;
      default: return `url(#${bodyGrad})`;
    }
  })();

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

        {/* Camouflage pattern — irregular blotches (Tomas §2.2) */}
        <pattern id={camouflagePattern} patternUnits="userSpaceOnUse" width="18" height="18">
          <rect width="18" height="18" fill={`url(#${bodyGrad})`} />
          <ellipse cx="9" cy="9" rx="4" ry="3" fill={c.dark} opacity="0.45" />
          <ellipse cx="3" cy="3" rx="3" ry="2" fill={c.dark} opacity="0.35" />
          <ellipse cx="14" cy="15" rx="3.5" ry="2.5" fill={c.dark} opacity="0.3" />
          <ellipse cx="15" cy="5" rx="2" ry="1.5" fill={c.light} opacity="0.3" />
          <ellipse cx="4" cy="13" rx="2.5" ry="1.5" fill={c.light} opacity="0.25" />
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
      <path d={`M ${110 - m.rx} 60 Q ${110 - m.rx - 30} 15 ${110 - m.rx - 50} 35 Q ${110 - m.rx - 55} 60 ${110 - m.rx - 50} 85 Q ${110 - m.rx - 30} 105 ${110 - m.rx} 60 Z`} fill={`url(#${finGrad})`} />
      <path d={`M ${110 - m.rx} 60 Q ${110 - m.rx - 25} 25 ${110 - m.rx - 43} 45 Q ${110 - m.rx - 47} 60 ${110 - m.rx - 43} 75 Q ${110 - m.rx - 25} 95 ${110 - m.rx} 60 Z`} fill={`url(#${finGrad})`} opacity="0.7" />
      <path d={`M ${110 - m.rx} 60 Q ${110 - m.rx - 20} 35 ${110 - m.rx - 37} 52 Q ${110 - m.rx - 40} 60 ${110 - m.rx - 37} 68 Q ${110 - m.rx - 20} 85 ${110 - m.rx} 60 Z`} fill={`url(#${finGrad})`} opacity="0.4" />

      {/* Main body — SVG path per Tomas §2.2 body shape */}
      <path d={bodyPath} fill={patternFill} stroke="#2C3E50" strokeWidth="0.5" />

      {/* Dorsal fin on top */}
      <path d={`M ${110 - m.rx * 0.3} ${60 - m.ry} Q 110 ${60 - m.ry - 14} ${110 + m.rx * 0.3} ${60 - m.ry + 3}`} fill={hex} opacity="0.6" stroke={c.dark} strokeWidth="0.5" />

      {/* Belly highlight */}
      <ellipse cx={105} cy={60 + m.ry * 0.2} rx={m.rx * 0.55} ry={m.ry * 0.35} fill="rgba(255,255,255,0.3)" />

      {/* Scale highlights */}
      <ellipse cx={95} cy={52} rx={m.rx * 0.35} ry={m.ry * 0.12} fill="rgba(255,255,255,0.15)" />
      <ellipse cx={100} cy={58} rx={m.rx * 0.28} ry={m.ry * 0.1} fill="rgba(255,255,255,0.12)" />

      {/* Eye — positioned on right side of body */}
      <circle cx={110 + m.rx * 0.75} cy={60 - m.ry * 0.25} r={Math.max(m.ry * 0.15, 3)} fill="white" stroke={c.dark} strokeWidth="0.5" />
      <circle cx={110 + m.rx * 0.75} cy={60 - m.ry * 0.25} r={Math.max(m.ry * 0.085, 1.5)} fill="#1a1a1a" />
      <circle cx={110 + m.rx * 0.75 + 1} cy={60 - m.ry * 0.25 - 1} r={Math.max(m.ry * 0.04, 0.8)} fill="white" />

      {/* Mouth */}
      <ellipse cx={110 + m.rx} cy={60} rx={Math.max(m.ry * 0.08, 1)} ry={Math.max(m.ry * 0.06, 1)} fill={c.dark} opacity="0.6" />

      {/* Pectoral fin (bottom) */}
      <ellipse cx={125} cy={60 + m.ry * 0.55} rx={m.rx * 0.22} ry={m.ry * 0.18} fill={hex} opacity="0.45" transform={`rotate(15 125 ${60 + m.ry * 0.55})`} />

      {/* Nickname label (small, below fish) */}
      {nickname && (
        <text x="110" y={60 + m.ry + 14} textAnchor="middle" fontSize="9" fill="#888" fontFamily="sans-serif">
          {nickname}
        </text>
      )}
    </svg>
  );
}

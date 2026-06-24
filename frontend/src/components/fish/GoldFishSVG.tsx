'use client';

import { useId } from 'react';

interface GoldFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Goldfish — round plump body, big flowing tail fin, protruding eyes.
 * Orange-red gradient with white belly highlight.
 */
export function GoldFishSVG({ size, className }: GoldFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `goldBody_${uid}`;
  const tail = `goldTail_${uid}`;
  const belly = `goldBelly_${uid}`;
  return (
    <svg
      viewBox="0 0 200 120"
      width={size ?? '100%'}
      height={size ? undefined : '100%'}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Goldfish"
    >
      <defs>
        <radialGradient id={body} cx="0.4" cy="0.4">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="0.5" stopColor="#f97316" />
          <stop offset="1" stopColor="#ea580c" />
        </radialGradient>
        <linearGradient id={tail} x1="0" x2="1">
          <stop offset="0" stopColor="#f97316" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#fb923c" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fef3c7" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={belly} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fef3c7" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Big flowing tail fin (3 layers for depth) */}
      <path d="M 55 60 Q 25 15 5 35 Q 0 60 5 85 Q 25 105 55 60 Z" fill={`url(#${tail})`} />
      <path d="M 55 60 Q 30 25 12 45 Q 8 60 12 75 Q 30 95 55 60 Z" fill={`url(#${tail})`} opacity="0.7" />
      <path d="M 55 60 Q 35 35 18 52 Q 15 60 18 68 Q 35 85 55 60 Z" fill={`url(#${tail})`} opacity="0.4" />

      {/* Round plump body */}
      <ellipse cx="110" cy="60" rx="52" ry="38" fill={`url(#${body})`} />

      {/* White belly highlight */}
      <ellipse cx="105" cy="72" rx="30" ry="16" fill={`url(#${belly})`} />

      {/* Dorsal ridge */}
      <path d="M 85 28 Q 105 15 135 32" fill="none" stroke="#ea580c" strokeWidth="2" opacity="0.5" />

      {/* Protruding eyes (on stalks) */}
      <circle cx="152" cy="48" r="6" fill="#ffffff" stroke="#ea580c" strokeWidth="0.5" />
      <circle cx="152" cy="48" r="3.5" fill="#1a1a1a" />
      <circle cx="153" cy="47" r="1.5" fill="#ffffff" />

      <circle cx="152" cy="62" r="6" fill="#ffffff" stroke="#ea580c" strokeWidth="0.5" />
      <circle cx="152" cy="62" r="3.5" fill="#1a1a1a" />
      <circle cx="153" cy="61" r="1.5" fill="#ffffff" />

      {/* Mouth */}
      <ellipse cx="160" cy="56" rx="3" ry="2" fill="#c2410c" opacity="0.6" />

      {/* Pectoral fin */}
      <ellipse cx="125" cy="82" rx="10" ry="5" fill="#fb923c" opacity="0.5" transform="rotate(15 125 82)" />

      {/* Scale highlights */}
      <ellipse cx="95" cy="52" rx="18" ry="4" fill="rgba(255,255,255,0.25)" />
      <ellipse cx="100" cy="58" rx="14" ry="3" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

'use client';

import { useId } from 'react';

interface CoryFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Corydoras (鼠鱼) — cylindrical body, brown-grey with horizontal stripes,
 * normal fins, barbels, bottom-dwelling posture.
 */
export function CoryFishSVG({ size, className }: CoryFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `coryBody_${uid}`;
  const stripe = `coryStripe_${uid}`;
  const belly = `coryBelly_${uid}`;
  return (
    <svg
      viewBox="0 0 200 120"
      width={size ?? '100%'}
      height={size ? undefined : '100%'}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Corydoras"
    >
      <defs>
        <linearGradient id={body} x1="0" x2="1" y1="0.5" y2="0.5">
          <stop offset="0" stopColor="#8B7355" />
          <stop offset="0.5" stopColor="#A0926B" />
          <stop offset="1" stopColor="#6B5B3D" />
        </linearGradient>
        <linearGradient id={stripe} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5C4033" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="#8B7355" stopOpacity="0.1" />
          <stop offset="1" stopColor="#5C4033" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={belly} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#C4A882" stopOpacity="0.6" />
          <stop offset="1" stopColor="#E8D5B7" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Tail fin */}
      <path d="M 48 58 Q 20 40 8 55 Q 15 68 48 62 Z" fill="#6B5B3D" opacity="0.7" />

      {/* Cylindrical body */}
      <ellipse cx="105" cy="60" rx="50" ry="28" fill={`url(#${body})`} />

      {/* Horizontal stripes */}
      <path d="M 65 50 Q 105 47 145 50" fill="none" stroke={`url(#${stripe})`} strokeWidth="3" />
      <path d="M 65 56 Q 105 53 145 56" fill="none" stroke={`url(#${stripe})`} strokeWidth="2.5" />
      <path d="M 65 62 Q 105 59 145 62" fill="none" stroke={`url(#${stripe})`} strokeWidth="2" />

      {/* Belly highlight */}
      <ellipse cx="102" cy="72" rx="28" ry="10" fill={`url(#${belly})`} />

      {/* Dorsal fin */}
      <path d="M 100 33 Q 105 20 115 32" fill="#7A6548" opacity="0.8" />

      {/* Pectoral fins */}
      <path d="M 115 78 Q 125 90 110 88" fill="#7A6548" opacity="0.5" />
      <path d="M 95 78 Q 85 90 100 88" fill="#7A6548" opacity="0.5" />

      {/* Barbels */}
      <line x1="155" y1="56" x2="170" y2="52" stroke="#5C4033" strokeWidth="1" opacity="0.6" />
      <line x1="155" y1="60" x2="170" y2="60" stroke="#5C4033" strokeWidth="1" opacity="0.6" />

      {/* Eye */}
      <circle cx="145" cy="52" r="5" fill="#ffffff" stroke="#5C4033" strokeWidth="0.5" />
      <circle cx="145" cy="52" r="3" fill="#1a1a1a" />
      <circle cx="146" cy="51" r="1.2" fill="#ffffff" />

      {/* Mouth */}
      <ellipse cx="155" cy="58" rx="2.5" ry="1.5" fill="#5C4033" opacity="0.6" />

      {/* Scale highlights */}
      <ellipse cx="90" cy="55" rx="12" ry="3" fill="rgba(255,255,255,0.12)" />
    </svg>
  );
}

'use client';

import { useId } from 'react';

interface GuppyFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Guppy — streamlined body + huge fan tail, blue→purple→orange 3-stop gradient.
 * Key detail: tail-root bridge gradient connects body to tail seamlessly.
 * Source: YoYu_UI_Design_v4_FishSVG_v1_20260617.html (P1 v2).
 */
export function GuppyFishSVG({ size, className }: GuppyFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `guppyBody_${uid}`;
  const tail = `guppyTail_${uid}`;
  const root = `guppyRoot_${uid}`;
  return (
    <svg
      viewBox="0 0 200 120"
      width={size ?? '100%'}
      height={size ? undefined : '100%'}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Guppy"
    >
      <defs>
        <linearGradient id={body} x1="0" x2="1">
          <stop offset="0" stopColor="#0ea5e9" />
          <stop offset="0.5" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
        {/* Tail root bridge (blue-green → orange-pink) — the critical detail. */}
        <linearGradient id={tail} x1="0" x2="1">
          <stop offset="0" stopColor="#06b6d4" />
          <stop offset="0.3" stopColor="#a78bfa" />
          <stop offset="0.6" stopColor="#f97316" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={root} x1="0" x2="1">
          <stop offset="0" stopColor="#10b981" stopOpacity="0.9" />
          <stop offset="1" stopColor="#06b6d4" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Big fan tail (multi-layer, root-colored start) */}
      <path d="M 70 60 Q 50 30 15 45 Q 8 60 15 75 Q 50 90 70 60 Z" fill={`url(#${tail})`} />
      <path d="M 70 60 Q 55 35 25 50 Q 20 60 25 70 Q 55 85 70 60 Z" fill={`url(#${tail})`} opacity="0.6" />
      {/* Tail-root bridge band (blue-green, extends from body into tail) */}
      <ellipse cx="78" cy="60" rx="15" ry="20" fill={`url(#${root})`} opacity="0.85" />
      {/* Body: streamlined elongated */}
      <ellipse cx="115" cy="60" rx="45" ry="18" fill={`url(#${body})`} />
      {/* Scale highlight */}
      <ellipse cx="110" cy="52" rx="18" ry="3" fill="rgba(255,255,255,0.4)" />
      {/* Eye + highlight */}
      <circle cx="150" cy="58" r="3" fill="#1a1a1a" />
      <circle cx="151" cy="57" r="1.2" fill="#ffffff" />
      {/* Dorsal fin */}
      <path d="M 110 45 Q 120 35 130 47" fill="rgba(34,211,238,0.5)" stroke="#22d3ee" strokeWidth="0.5" />
    </svg>
  );
}

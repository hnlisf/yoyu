'use client';

import { useId } from 'react';

interface GuppyFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Guppy — small sleek body, huge fan-shaped tail, bright rainbow colors.
 * Blue-green body with purple→orange→pink fan tail.
 */
export function GuppyFishSVG({ size, className }: GuppyFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `guppyBody_${uid}`;
  const tail = `guppyTail_${uid}`;
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
        <linearGradient id={body} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0891b2" />
          <stop offset="0.5" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id={tail} x1="0" x2="1" y1="0.3" y2="0.7">
          <stop offset="0" stopColor="#06b6d4" />
          <stop offset="0.2" stopColor="#8b5cf6" />
          <stop offset="0.5" stopColor="#f97316" />
          <stop offset="0.8" stopColor="#ec4899" />
          <stop offset="1" stopColor="#f472b6" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Huge fan-shaped tail (3 layers) */}
      <path d="M 75 60 Q 40 10 5 20 Q -5 60 5 100 Q 40 110 75 60 Z" fill={`url(#${tail})`} />
      <path d="M 75 60 Q 45 20 15 32 Q 8 60 15 88 Q 45 100 75 60 Z" fill={`url(#${tail})`} opacity="0.7" />
      <path d="M 75 60 Q 50 30 25 40 Q 20 60 25 80 Q 50 90 75 60 Z" fill={`url(#${tail})`} opacity="0.5" />

      {/* Tail vein lines */}
      <path d="M 72 60 Q 40 25 10 30" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      <path d="M 72 60 Q 40 95 10 90" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      <path d="M 72 60 Q 50 40 25 45" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
      <path d="M 72 60 Q 50 80 25 75" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />

      {/* Small sleek body */}
      <ellipse cx="115" cy="60" rx="42" ry="14" fill={`url(#${body})`} />

      {/* Neon lateral stripe */}
      <line x1="80" y1="57" x2="145" y2="57" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />

      {/* Dorsal fin — tall and sharp */}
      <path d="M 105 47 Q 112 30 125 48" fill="rgba(8,145,178,0.7)" stroke="#0891b2" strokeWidth="0.5" />

      {/* Belly fin */}
      <path d="M 108 73 Q 112 80 120 73" fill="rgba(6,182,212,0.4)" />

      {/* Scale highlight */}
      <ellipse cx="110" cy="54" rx="16" ry="3" fill="rgba(255,255,255,0.4)" />

      {/* Eye */}
      <circle cx="148" cy="58" r="3.5" fill="#1a1a1a" />
      <circle cx="149" cy="57" r="1.3" fill="#ffffff" />
    </svg>
  );
}

'use client';

import { useId } from 'react';

interface BettaFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Betta — short fat body + silky flowing tail, blue-violet → purple → pink
 * gradient. Key detail: tail-root bridge connects body to silk tail.
 * Source: FishGrow_UI_Design_v4_FishSVG_v1_20260617.html (P1 v2).
 */
export function BettaFishSVG({ size, className }: BettaFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `bettaBody_${uid}`;
  const tail = `bettaTail_${uid}`;
  const root = `bettaRoot_${uid}`;
  return (
    <svg
      viewBox="0 0 200 120"
      width={size ?? '100%'}
      height={size ? undefined : '100%'}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Betta"
    >
      <defs>
        <linearGradient id={body} x1="0" x2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="0.5" stopColor="#6d28d9" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        {/* Tail root bridge (blue-violet → pink-violet) — critical detail. */}
        <linearGradient id={tail} x1="0" x2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.4" stopColor="#a855f7" />
          <stop offset="0.8" stopColor="#ec4899" />
          <stop offset="1" stopColor="#f472b6" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={root} x1="0" x2="1">
          <stop offset="0" stopColor="#1e3a8a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#7c3aed" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {/* Silk flowing tail (multi-layer + flowing curves, blue-violet root) */}
      <path d="M 75 60 Q 45 28 18 48 Q 12 60 18 72 Q 45 92 75 60 Z" fill={`url(#${tail})`} />
      <path d="M 75 60 Q 50 33 30 50 Q 26 60 30 70 Q 50 87 75 60 Z" fill={`url(#${tail})`} opacity="0.6" />
      <path d="M 75 60 Q 55 40 38 55 Q 35 60 38 65 Q 55 80 75 60 Z" fill={`url(#${tail})`} opacity="0.4" />
      {/* Tail-root bridge band (blue-violet, connects body to tail) */}
      <ellipse cx="83" cy="60" rx="14" ry="24" fill={`url(#${root})`} opacity="0.9" />
      {/* Short fat body */}
      <ellipse cx="115" cy="60" rx="40" ry="28" fill={`url(#${body})`} />
      {/* Highlight */}
      <ellipse cx="110" cy="50" rx="15" ry="4" fill="rgba(255,255,255,0.3)" />
      {/* Eye */}
      <circle cx="148" cy="55" r="3" fill="#1a1a1a" />
      <circle cx="149" cy="54" r="1.2" fill="#ffffff" />
      {/* Dorsal fin */}
      <path d="M 110 35 Q 120 25 130 38" fill="rgba(124,58,237,0.5)" stroke="#7c3aed" strokeWidth="0.5" />
    </svg>
  );
}

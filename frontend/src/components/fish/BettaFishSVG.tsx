'use client';

import { useId } from 'react';

interface BettaFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Betta (Siamese Fighting Fish) — fan-like flowing multi-layered tail,
 * aggressive angular face, deep blue-violet to pink gradient,
 * sharp pectoral fins.
 */
export function BettaFishSVG({ size, className }: BettaFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `bettaBody_${uid}`;
  const tail = `bettaTail_${uid}`;
  const finGrad = `bettaFin_${uid}`;
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
          <stop offset="0.4" stopColor="#5b21b6" />
          <stop offset="0.8" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id={tail} x1="0" x2="1" y1="0.3" y2="0.7">
          <stop offset="0" stopColor="#5b21b6" />
          <stop offset="0.3" stopColor="#8b5cf6" />
          <stop offset="0.6" stopColor="#ec4899" />
          <stop offset="1" stopColor="#f472b6" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={finGrad} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#7c3aed" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ec4899" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Massive flowing tail — multi-layered fan shape */}
      <path d="M 78 60 Q 40 5 8 15 Q -5 60 8 105 Q 40 115 78 60 Z" fill={`url(#${tail})`} />
      <path d="M 78 60 Q 45 15 18 28 Q 10 60 18 92 Q 45 105 78 60 Z" fill={`url(#${tail})`} opacity="0.7" />
      <path d="M 78 60 Q 50 28 28 40 Q 22 60 28 80 Q 50 92 78 60 Z" fill={`url(#${tail})`} opacity="0.5" />
      <path d="M 78 60 Q 55 38 38 50 Q 34 60 38 70 Q 55 82 78 60 Z" fill={`url(#${tail})`} opacity="0.3" />

      {/* Tail vein patterns */}
      <path d="M 75 60 Q 35 25 15 35" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
      <path d="M 75 60 Q 35 95 15 85" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
      <path d="M 75 60 Q 50 35 30 45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <path d="M 75 60 Q 50 85 30 75" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

      {/* Body — compact, slightly angular (aggressive stance) */}
      <path
        d="M 85 45 Q 95 35 130 40 Q 150 48 155 60 Q 150 72 130 80 Q 95 85 85 75 Z"
        fill={`url(#${body})`}
      />

      {/* Iridescent scale highlight */}
      <ellipse cx="115" cy="52" rx="18" ry="5" fill="rgba(255,255,255,0.2)" />
      <ellipse cx="118" cy="50" rx="12" ry="3" fill="rgba(168,85,247,0.3)" />

      {/* Dorsal fin — sharp and tall */}
      <path
        d="M 95 42 Q 100 15 120 25 Q 130 30 135 40"
        fill={`url(#${finGrad})`}
        stroke="#7c3aed"
        strokeWidth="0.8"
      />

      {/* Anal fin — flowing down */}
      <path
        d="M 95 78 Q 100 100 120 92 Q 130 85 135 75"
        fill={`url(#${finGrad})`}
        stroke="#7c3aed"
        strokeWidth="0.8"
      />

      {/* Aggressive pectoral fins (sharp, forward) */}
      <path d="M 130 65 Q 140 72 148 68" fill="none" stroke="#7c3aed" strokeWidth="1.5" opacity="0.6" />
      <path d="M 130 58 Q 140 50 148 54" fill="none" stroke="#7c3aed" strokeWidth="1.5" opacity="0.6" />

      {/* Eye — aggressive, sharp */}
      <circle cx="148" cy="53" r="3.5" fill="#fbbf24" />
      <circle cx="148.5" cy="52.5" r="2.2" fill="#1e293b" />
      <circle cx="149" cy="52" r="0.8" fill="#ffffff" />

      {/* Mouth — angular/jutting jaw */}
      <path d="M 156 57 L 160 56 L 156 60" fill="none" stroke="#4c1d95" strokeWidth="1.2" opacity="0.8" />

      {/* Gill cover — dark, angular */}
      <path d="M 125 48 Q 120 60 125 72" fill="none" stroke="#4c1d95" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

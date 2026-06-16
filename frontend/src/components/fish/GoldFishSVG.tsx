'use client';

import { useId } from 'react';

interface GoldFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Goldfish — round head tumor + short round double-layer tail, orange-red gradient.
 * Source: FishGrow_UI_Design_v4_FishSVG_v1_20260617.html (P1 v2).
 * Gradient IDs are namespaced via React.useId() to avoid collisions across
 * multiple SVG instances on the same page.
 */
export function GoldFishSVG({ size, className }: GoldFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `goldBody_${uid}`;
  const tail = `goldTail_${uid}`;
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
        <linearGradient id={body} x1="0" x2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="0.6" stopColor="#f97316" />
          <stop offset="1" stopColor="#fef3c7" />
        </linearGradient>
        <linearGradient id={tail} x1="0" x2="1">
          <stop offset="0" stopColor="#fb923c" stopOpacity="0.85" />
          <stop offset="0.4" stopColor="#f97316" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fef3c7" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* Long tail (with gradient) */}
      <path d="M 60 60 Q 30 28 8 48 Q 4 60 8 72 Q 30 92 60 60 Z" fill={`url(#${tail})`} />
      <path d="M 60 60 Q 35 35 18 55 Q 14 60 18 65 Q 35 85 60 60 Z" fill={`url(#${tail})`} opacity="0.5" />
      {/* Body */}
      <ellipse cx="110" cy="60" rx="50" ry="35" fill={`url(#${body})`} />
      {/* Head tumor (top of head) */}
      <circle cx="150" cy="50" r="14" fill="#fb923c" opacity="0.8" />
      <circle cx="155" cy="45" r="8" fill="#f97316" opacity="0.6" />
      {/* Eye + highlight */}
      <circle cx="145" cy="55" r="4" fill="#1a1a1a" />
      <circle cx="146" cy="54" r="1.5" fill="#ffffff" />
      {/* Scale highlight */}
      <ellipse cx="100" cy="50" rx="20" ry="6" fill="rgba(255,255,255,0.3)" />
      {/* Pectoral fin */}
      <ellipse cx="130" cy="75" rx="8" ry="4" fill="rgba(254,243,199,0.4)" transform="rotate(20 130 75)" />
    </svg>
  );
}

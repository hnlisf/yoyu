'use client';

import { useId } from 'react';

interface TropicalFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Tropical fish (热带鱼) — based on angelfish/butterflyfish profile.
 * Tall compressed diamond body, bold vertical stripes, bright yellow-orange
 * accents, small eye, delicate thread-like dorsal and anal fins.
 * Visually distinct: vertical stripe pattern + tall thin body.
 */
export function TropicalFishSVG({ size, className }: TropicalFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `tropBody_${uid}`;
  const tail = `tropTail_${uid}`;
  return (
    <svg
      viewBox="0 0 200 120"
      width={size ?? '100%'}
      height={size ? undefined : '100%'}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Tropical fish"
    >
      <defs>
        <linearGradient id={body} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="0.3" stopColor="#fde68a" />
          <stop offset="0.7" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id={tail} x1="0" x2="1">
          <stop offset="0" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#fef9c3" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {/* Thread-like dorsal fin (top) */}
      <path d="M 75 30 Q 105 10 140 45" fill="none" stroke="#fbbf24" strokeWidth="1.8" opacity="0.8" />
      <path d="M 80 33 Q 100 18 130 47" fill="none" stroke="#fde68a" strokeWidth="1" opacity="0.5" />
      {/* Thread-like anal fin (bottom) */}
      <path d="M 75 90 Q 105 110 140 75" fill="none" stroke="#fbbf24" strokeWidth="1.8" opacity="0.8" />
      <path d="M 80 87 Q 100 102 130 73" fill="none" stroke="#fde68a" strokeWidth="1" opacity="0.5" />
      {/* Tall diamond/compressed body */}
      <path d="M 70 60 L 145 32 L 145 88 Z" fill={`url(#${body})`} stroke="#f59e0b" strokeWidth="1.2" />
      {/* Bold vertical stripes */}
      <line x1="90" y1="38" x2="90" y2="82" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
      <line x1="110" y1="34" x2="110" y2="86" stroke="#1a1a1a" strokeWidth="2.5" opacity="0.5" />
      <line x1="130" y1="36" x2="130" y2="84" stroke="#ffffff" strokeWidth="2.5" opacity="0.6" />
      {/* Spot pattern overlay */}
      <circle cx="105" cy="50" r="2" fill="#1a1a1a" opacity="0.4" />
      <circle cx="120" cy="65" r="2.5" fill="#1a1a1a" opacity="0.35" />
      <circle cx="100" cy="70" r="1.8" fill="#1a1a1a" opacity="0.4" />
      {/* Tail stem + small caudal fin */}
      <line x1="145" y1="60" x2="162" y2="60" stroke={`url(#${tail})`} strokeWidth="2.5" />
      <path d="M 162 53 L 178 48 L 178 72 L 162 67 Z" fill={`url(#${body})`} stroke="#f59e0b" strokeWidth="0.8" opacity="0.85" />
      {/* Small eye */}
      <circle cx="138" cy="56" r="2.5" fill="#1a1a1a" />
      <circle cx="139" cy="55" r="1" fill="#ffffff" />
      {/* Pectoral fin dot */}
      <ellipse cx="115" cy="85" rx="6" ry="3" fill="rgba(251,191,36,0.3)" transform="rotate(-15 115 85)" />
    </svg>
  );
}

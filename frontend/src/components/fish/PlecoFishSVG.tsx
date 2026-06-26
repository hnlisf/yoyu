'use client';

import { useId } from 'react';

interface PlecoFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Pleco (异形/清道夫) — flattened body, deep brown with vertical stripes,
 * sucker mouth, armored plates, low posture.
 */
export function PlecoFishSVG({ size, className }: PlecoFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `plecoBody_${uid}`;
  const armor = `plecoArmor_${uid}`;
  return (
    <svg
      viewBox="0 0 200 120"
      width={size ?? '100%'}
      height={size ? undefined : '100%'}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Pleco"
    >
      <defs>
        <linearGradient id={body} x1="0" x2="1" y1="0.3" y2="0.7">
          <stop offset="0" stopColor="#4A3728" />
          <stop offset="0.4" stopColor="#5C4033" />
          <stop offset="0.7" stopColor="#3E2723" />
          <stop offset="1" stopColor="#2E1C15" />
        </linearGradient>
        <pattern id={armor} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="none" />
          <path d="M 0 6 L 12 6" stroke="#3E2723" strokeWidth="0.5" opacity="0.4" />
          <path d="M 6 0 L 6 12" stroke="#3E2723" strokeWidth="0.5" opacity="0.4" />
        </pattern>
      </defs>

      {/* Wide tail fin */}
      <path d="M 45 55 Q 15 30 5 50 Q 10 70 45 65 Z" fill="#3E2723" opacity="0.7" />
      <path d="M 45 55 Q 20 40 10 52 Q 15 60 45 60 Z" fill="#2E1C15" opacity="0.5" />

      {/* Flattened wide body */}
      <ellipse cx="110" cy="58" rx="62" ry="24" fill={`url(#${body})`} />

      {/* Armored plate pattern */}
      <ellipse cx="110" cy="58" rx="62" ry="24" fill={`url(#${armor})`} opacity="0.6" />

      {/* Dark spots pattern */}
      <circle cx="75" cy="52" r="4" fill="#2E1C15" opacity="0.3" />
      <circle cx="90" cy="65" r="5" fill="#2E1C15" opacity="0.25" />
      <circle cx="105" cy="48" r="3.5" fill="#2E1C15" opacity="0.3" />
      <circle cx="120" cy="62" r="4" fill="#2E1C15" opacity="0.25" />
      <circle cx="135" cy="52" r="3" fill="#2E1C15" opacity="0.3" />

      {/* High dorsal fin */}
      <path d="M 100 35 Q 110 10 120 35" fill="#4A3728" opacity="0.8" />
      <path d="M 95 35 Q 105 15 115 35" fill="#5C4033" opacity="0.5" />

      {/* Pectoral fins (wide, bottom-dwelling) */}
      <path d="M 125 78 Q 140 95 110 88" fill="#4A3728" opacity="0.6" />
      <path d="M 95 78 Q 80 95 110 88" fill="#4A3728" opacity="0.6" />

      {/* Sucker mouth */}
      <ellipse cx="170" cy="62" rx="6" ry="4" fill="#2E1C15" opacity="0.7" />
      <path d="M 164 62 Q 170 59 176 62" fill="none" stroke="#1a1a1a" strokeWidth="0.5" />

      {/* Small eye */}
      <circle cx="155" cy="48" r="4" fill="#ffffff" stroke="#2E1C15" strokeWidth="0.5" />
      <circle cx="155" cy="48" r="2.5" fill="#1a1a1a" />
      <circle cx="156" cy="47" r="1" fill="#ffffff" />

      {/* Ventral fin */}
      <path d="M 130 80 Q 125 95 140 90" fill="#3E2723" opacity="0.5" />
    </svg>
  );
}

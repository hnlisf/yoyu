'use client';

import { useId } from 'react';

interface AngelFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Angelfish — triangular side profile + silver body + gold stripes + long
 * thread-like fins. Same-color gradient connects body to tail fin.
 * Source: FishGrow_UI_Design_v4_FishSVG_v1_20260617.html (P1 v2).
 */
export function AngelFishSVG({ size, className }: AngelFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `angelBody_${uid}`;
  const tail = `angelTail_${uid}`;
  return (
    <svg
      viewBox="0 0 200 120"
      width={size ?? '100%'}
      height={size ? undefined : '100%'}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Angelfish"
    >
      <defs>
        <linearGradient id={body} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e5e7eb" />
          <stop offset="1" stopColor="#9ca3af" />
        </linearGradient>
        <linearGradient id={tail} x1="0" x2="1">
          <stop offset="0" stopColor="#9ca3af" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* Long thread fins (top + bottom) */}
      <path d="M 80 35 Q 110 20 150 60" fill="none" stroke="#fde68a" strokeWidth="1.5" opacity="0.7" />
      <path d="M 80 85 Q 110 100 150 60" fill="none" stroke="#fde68a" strokeWidth="1.5" opacity="0.7" />
      {/* Triangular side body */}
      <path d="M 70 60 L 150 35 L 150 85 Z" fill={`url(#${body})`} stroke="#fde68a" strokeWidth="1.5" />
      {/* Gold stripes */}
      <line x1="90" y1="42" x2="90" y2="78" stroke="#fde68a" strokeWidth="1.5" opacity="0.6" />
      <line x1="110" y1="38" x2="110" y2="82" stroke="#fde68a" strokeWidth="1.5" opacity="0.6" />
      <line x1="130" y1="40" x2="130" y2="80" stroke="#fde68a" strokeWidth="1.5" opacity="0.6" />
      {/* Tail stem + caudal fin (gradient body→tail) */}
      <line x1="150" y1="60" x2="165" y2="60" stroke={`url(#${tail})`} strokeWidth="2.5" />
      <path d="M 165 55 L 180 50 L 180 70 L 165 65 Z" fill={`url(#${body})`} stroke="#fde68a" strokeWidth="1" opacity="0.85" />
      {/* Eye */}
      <circle cx="143" cy="58" r="2.5" fill="#1a1a1a" />
      <circle cx="144" cy="57" r="1" fill="#ffffff" />
    </svg>
  );
}

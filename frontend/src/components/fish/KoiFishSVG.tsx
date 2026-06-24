'use client';

import { useId } from 'react';

interface KoiFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Koi (锦鲤) — elongated spindle body with kohaku (red-on-white) pattern,
 * large sweeping single-lobe tail, small eye, two barbels near mouth.
 * Visually distinct from goldfish: longer body, different tail shape, red/white pattern.
 */
export function KoiFishSVG({ size, className }: KoiFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `koiBody_${uid}`;
  const tail = `koiTail_${uid}`;
  return (
    <svg
      viewBox="0 0 200 120"
      width={size ?? '100%'}
      height={size ? undefined : '100%'}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Koi fish"
    >
      <defs>
        <linearGradient id={body} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#fef2f2" />
          <stop offset="0.5" stopColor="#fecaca" />
          <stop offset="0.65" stopColor="#ef4444" />
          <stop offset="0.85" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1f5f9" />
        </linearGradient>
        <linearGradient id={tail} x1="0" x2="1">
          <stop offset="0" stopColor="#ef4444" stopOpacity="0.7" />
          <stop offset="0.5" stopColor="#fecaca" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* Sweeping, large single-lobe tail */}
      <path d="M 55 60 Q 30 25 10 40 Q 5 55 10 70 Q 30 85 55 60 Z" fill={`url(#${tail})`} />
      <path d="M 55 60 Q 35 35 18 50 Q 14 60 18 70 Q 35 85 55 60 Z" fill={`url(#${tail})`} opacity="0.5" />
      {/* Elongated spindle body */}
      <ellipse cx="110" cy="60" rx="65" ry="22" fill={`url(#${body})`} />
      {/* Red patches (kohaku pattern spots) */}
      <ellipse cx="115" cy="55" rx="18" ry="12" fill="#ef4444" opacity="0.75" />
      <ellipse cx="85" cy="62" rx="12" ry="9" fill="#dc2626" opacity="0.65" />
      <ellipse cx="145" cy="58" rx="10" ry="7" fill="#ef4444" opacity="0.5" />
      {/* Belly highlight */}
      <ellipse cx="110" cy="65" rx="40" ry="5" fill="rgba(255,255,255,0.6)" />
      {/* Small eye */}
      <circle cx="163" cy="57" r="2.5" fill="#1a1a1a" />
      <circle cx="163.5" cy="56" r="1" fill="#ffffff" />
      {/* Barbels (whiskers near mouth) */}
      <line x1="175" y1="55" x2="182" y2="48" stroke="#d1d5db" strokeWidth="0.8" opacity="0.7" />
      <line x1="175" y1="60" x2="182" y2="67" stroke="#d1d5db" strokeWidth="0.8" opacity="0.7" />
      {/* Dorsal fin ridge */}
      <path d="M 75 39 Q 100 30 130 40" fill="none" stroke="#dc2626" strokeWidth="1.5" opacity="0.5" />
      {/* Pectoral fin */}
      <ellipse cx="130" cy="77" rx="10" ry="4" fill="rgba(239,68,68,0.25)" transform="rotate(15 130 77)" />
    </svg>
  );
}

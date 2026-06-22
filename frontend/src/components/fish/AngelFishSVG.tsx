'use client';

import { useId } from 'react';

interface AngelFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Angelfish — tall triangular body, elegant sweeping fins,
 * silver gradient with gold vertical stripes.
 */
export function AngelFishSVG({ size, className }: AngelFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `angelBody_${uid}`;
  const fin = `angelFin_${uid}`;
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
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="0.4" stopColor="#cbd5e1" />
          <stop offset="0.7" stopColor="#f1f5f9" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id={fin} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#fde68a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#e2e8f0" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Elegant sweeping dorsal fin (top) — tall and flowing */}
      <path
        d="M 75 60 Q 85 15 110 8 Q 135 15 145 40"
        fill={`url(#${fin})`}
        stroke="#fde68a"
        strokeWidth="1"
        opacity="0.8"
      />

      {/* Fin rays (dorsal) */}
      <path d="M 85 50 Q 90 30 100 18" fill="none" stroke="#fde68a" strokeWidth="0.5" opacity="0.4" />
      <path d="M 100 45 Q 105 25 115 15" fill="none" stroke="#fde68a" strokeWidth="0.5" opacity="0.4" />
      <path d="M 115 42 Q 120 25 128 18" fill="none" stroke="#fde68a" strokeWidth="0.5" opacity="0.4" />

      {/* Elegant sweeping anal fin (bottom) */}
      <path
        d="M 75 60 Q 85 100 110 108 Q 135 100 145 70"
        fill={`url(#${fin})`}
        stroke="#fde68a"
        strokeWidth="1"
        opacity="0.8"
      />

      {/* Fin rays (anal) */}
      <path d="M 85 65 Q 90 85 100 98" fill="none" stroke="#fde68a" strokeWidth="0.5" opacity="0.4" />
      <path d="M 100 68 Q 105 88 115 100" fill="none" stroke="#fde68a" strokeWidth="0.5" opacity="0.4" />
      <path d="M 115 65 Q 120 85 128 95" fill="none" stroke="#fde68a" strokeWidth="0.5" opacity="0.4" />

      {/* Triangular body (tall diamond shape) */}
      <path d="M 65 60 L 145 36 L 145 84 Z" fill={`url(#${body})`} stroke="#fde68a" strokeWidth="1.5" />

      {/* Gold vertical stripes on body */}
      <line x1="82" y1="42" x2="82" y2="78" stroke="#fde68a" strokeWidth="2" opacity="0.7" />
      <line x1="100" y1="39" x2="100" y2="81" stroke="#fde68a" strokeWidth="2.5" opacity="0.8" />
      <line x1="118" y1="38" x2="118" y2="82" stroke="#fde68a" strokeWidth="2" opacity="0.7" />
      <line x1="136" y1="40" x2="136" y2="80" stroke="#fde68a" strokeWidth="1.5" opacity="0.5" />

      {/* Ventral thread fin (long trailing) */}
      <path d="M 100 78 Q 105 100 108 115" fill="none" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.7" />

      {/* Eye — prominent */}
      <circle cx="140" cy="54" r="3.5" fill="#1e293b" />
      <circle cx="141" cy="53" r="1.5" fill="#f8fafc" />
      <circle cx="140" cy="54" r="2" fill="none" stroke="#fde68a" strokeWidth="0.5" opacity="0.6" />

      {/* Small mouth */}
      <path d="M 147 58 Q 150 59 147 61" fill="none" stroke="#64748b" strokeWidth="0.8" />
    </svg>
  );
}

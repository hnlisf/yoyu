'use client';

import { useId } from 'react';

interface AngelFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Angelfish (神仙鱼) — tall compressed body, silver-grey with vertical black bands,
 * triangular dorsal/anal fins, elegant tropical shape.
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
        <linearGradient id={body} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#D4D4D4" />
          <stop offset="0.5" stopColor="#C0C0C0" />
          <stop offset="1" stopColor="#A0A0A0" />
        </linearGradient>
        <linearGradient id={fin} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#D4D4D4" stopOpacity="0.8" />
          <stop offset="0.5" stopColor="#C0C0C0" stopOpacity="0.4" />
          <stop offset="1" stopColor="#A0A0A0" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Tall triangular dorsal fin */}
      <path d="M 80 52 Q 90 5 110 5 Q 130 5 140 52 Z" fill={`url(#${fin})`} opacity="0.9" />
      <path d="M 85 52 Q 95 12 110 12 Q 125 12 135 52 Z" fill={`url(#${fin})`} opacity="0.5" />

      {/* Tall anal fin */}
      <path d="M 80 68 Q 90 115 110 115 Q 130 115 140 68 Z" fill={`url(#${fin})`} opacity="0.9" />
      <path d="M 85 68 Q 95 108 110 108 Q 125 108 135 68 Z" fill={`url(#${fin})`} opacity="0.5" />

      {/* Tail fin */}
      <path d="M 40 58 Q 15 45 5 56 Q 10 65 40 62 Z" fill="#A0A0A0" opacity="0.7" />
      <path d="M 42 58 Q 20 48 10 57 Q 15 62 42 60 Z" fill="#B0B0B0" opacity="0.5" />

      {/* Tall compressed body */}
      <ellipse cx="100" cy="60" rx="38" ry="32" fill={`url(#${body})`} />

      {/* Vertical black bands */}
      <rect x="75" y="30" width="4" height="60" rx="2" fill="#333333" opacity="0.35" />
      <rect x="88" y="28" width="5" height="64" rx="2.5" fill="#333333" opacity="0.5" />
      <rect x="105" y="28" width="5" height="64" rx="2.5" fill="#333333" opacity="0.5" />
      <rect x="118" y="30" width="4" height="60" rx="2" fill="#333333" opacity="0.35" />

      {/* Metallic shimmer */}
      <ellipse cx="95" cy="55" rx="15" ry="8" fill="rgba(255,255,255,0.3)" />
      <ellipse cx="105" cy="65" rx="10" ry="5" fill="rgba(255,255,255,0.15)" />

      {/* Pectoral fins (long trailing) */}
      <path d="M 122 58 Q 145 65 155 75" fill="none" stroke="#B0B0B0" strokeWidth="1.5" opacity="0.5" />

      {/* Eye */}
      <circle cx="130" cy="48" r="4" fill="#ffffff" stroke="#666666" strokeWidth="0.5" />
      <circle cx="130" cy="48" r="2.5" fill="#cc0000" />
      <circle cx="131" cy="47" r="1" fill="#ffffff" />

      {/* Mouth */}
      <ellipse cx="136" cy="54" rx="2" ry="1.5" fill="#666666" opacity="0.5" />

      {/* Ventral feelers */}
      <path d="M 95 90 Q 90 105 98 108" fill="none" stroke="#C0C0C0" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

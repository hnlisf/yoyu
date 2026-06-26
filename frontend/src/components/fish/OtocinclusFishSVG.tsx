'use client';

import { useId } from 'react';

interface OtocinclusFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Otocinclus (清道夫/小精灵) — small slender body, grey-brown with fine dots,
 * normal fins, algae-eating bottom dweller.
 */
export function OtocinclusFishSVG({ size, className }: OtocinclusFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `otoBody_${uid}`;
  const belly = `otoBelly_${uid}`;
  return (
    <svg
      viewBox="0 0 200 120"
      width={size ?? '100%'}
      height={size ? undefined : '100%'}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Otocinclus"
    >
      <defs>
        <linearGradient id={body} x1="0" x2="1" y1="0.4" y2="0.6">
          <stop offset="0" stopColor="#A09A8B" />
          <stop offset="0.5" stopColor="#B8B0A0" />
          <stop offset="1" stopColor="#8A8478" />
        </linearGradient>
        <linearGradient id={belly} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#D4CFC4" stopOpacity="0.5" />
          <stop offset="1" stopColor="#F0EDE5" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Tail fin */}
      <path d="M 48 58 Q 22 42 10 56 Q 15 66 48 62 Z" fill="#8A8478" opacity="0.7" />

      {/* Slender body */}
      <ellipse cx="110" cy="60" rx="58" ry="20" fill={`url(#${body})`} />

      {/* Dotted pattern */}
      <circle cx="70" cy="55" r="1.5" fill="#6B6558" opacity="0.35" />
      <circle cx="80" cy="63" r="1.5" fill="#6B6558" opacity="0.3" />
      <circle cx="90" cy="53" r="1" fill="#6B6558" opacity="0.35" />
      <circle cx="100" cy="66" r="1.5" fill="#6B6558" opacity="0.25" />
      <circle cx="110" cy="54" r="1" fill="#6B6558" opacity="0.3" />
      <circle cx="120" cy="63" r="1.5" fill="#6B6558" opacity="0.35" />
      <circle cx="130" cy="55" r="1" fill="#6B6558" opacity="0.3" />
      <circle cx="140" cy="62" r="1.5" fill="#6B6558" opacity="0.25" />

      {/* Dark lateral stripe */}
      <path d="M 65 60 Q 110 63 148 60" fill="none" stroke="#6B6558" strokeWidth="2" opacity="0.4" />

      {/* Belly highlight */}
      <ellipse cx="105" cy="68" rx="32" ry="8" fill={`url(#${belly})`} />

      {/* Dorsal fin */}
      <path d="M 105 41 Q 110 28 118 41" fill="#8A8478" opacity="0.7" />

      {/* Pectoral fins */}
      <path d="M 120 72 Q 130 84 112 80" fill="#8A8478" opacity="0.5" />
      <path d="M 100 72 Q 90 84 108 80" fill="#8A8478" opacity="0.5" />

      {/* Eye */}
      <circle cx="155" cy="52" r="4.5" fill="#ffffff" stroke="#6B6558" strokeWidth="0.5" />
      <circle cx="155" cy="52" r="2.5" fill="#1a1a1a" />
      <circle cx="156" cy="51" r="1" fill="#ffffff" />

      {/* Small sucker mouth */}
      <ellipse cx="165" cy="58" rx="3" ry="2" fill="#6B6558" opacity="0.5" />

      {/* Scale shimmer */}
      <ellipse cx="95" cy="56" rx="10" ry="2" fill="rgba(255,255,255,0.1)" />
    </svg>
  );
}

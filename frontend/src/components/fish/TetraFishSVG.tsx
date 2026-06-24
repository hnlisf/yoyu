'use client';

import { useId } from 'react';

interface TetraFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Tetra — small compact body, horizontal stripes, silver-white coloring
 * with a neon blue-red horizontal stripe.
 */
export function TetraFishSVG({ size, className }: TetraFishSVGProps) {
  const uid = useId().replace(/:/g, '_');
  const body = `tetraBody_${uid}`;
  const stripe = `tetraStripe_${uid}`;
  return (
    <svg
      viewBox="0 0 200 120"
      width={size ?? '100%'}
      height={size ? undefined : '100%'}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Tetra"
    >
      <defs>
        <linearGradient id={body} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="0.5" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id={stripe} x1="0" x2="1">
          <stop offset="0" stopColor="#06b6d4" />
          <stop offset="0.3" stopColor="#22d3ee" />
          <stop offset="0.6" stopColor="#ef4444" />
          <stop offset="1" stopColor="#f87171" />
        </linearGradient>
      </defs>

      {/* Small triangular tail */}
      <path d="M 65 60 L 45 52 L 48 60 L 45 68 Z" fill="#94a3b8" opacity="0.8" />

      {/* Compact silver body */}
      <ellipse cx="105" cy="60" rx="38" ry="15" fill={`url(#${body})`} />

      {/* Darker back */}
      <path d="M 75 48 Q 105 42 140 50" fill="none" stroke="#64748b" strokeWidth="1" opacity="0.4" />

      {/* Neon horizontal stripe */}
      <line x1="72" y1="60" x2="135" y2="60" stroke={`url(#${stripe})`} strokeWidth="2.5" opacity="0.95" />

      {/* Upper thin stripe (white/silver) */}
      <line x1="72" y1="54" x2="130" y2="54" stroke="#f8fafc" strokeWidth="1" opacity="0.6" />

      {/* Lower thin stripe */}
      <line x1="72" y1="66" x2="130" y2="66" stroke="#cbd5e1" strokeWidth="1" opacity="0.4" />

      {/* Small dorsal fin */}
      <path d="M 95 47 Q 102 38 112 47" fill="#64748b" opacity="0.4" stroke="#94a3b8" strokeWidth="0.5" />

      {/* Ventral fin */}
      <path d="M 90 74 Q 95 80 100 74" fill="#94a3b8" opacity="0.3" />

      {/* Eye with silver iris */}
      <circle cx="134" cy="57" r="3" fill="#1e293b" />
      <circle cx="135" cy="56" r="1.5" fill="#f8fafc" />
      <circle cx="134.5" cy="56.5" r="0.8" fill="#1e293b" />

      {/* Gill line */}
      <path d="M 115 52 Q 112 60 115 68" fill="none" stroke="#94a3b8" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}

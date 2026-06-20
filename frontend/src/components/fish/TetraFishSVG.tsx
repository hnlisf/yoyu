'use client';

import { useId } from 'react';

interface TetraFishSVGProps {
  size?: number;
  className?: string;
}

/**
 * Tetra — small, compact body + tiny triangle tail, neon blue→red gradient
 * with rainbow stripe side-line. Schooling-friendly small fish.
 * Source: YoYu_UI_Design_v4_FishSVG_v1_20260617.html (P1 v2).
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
        <linearGradient id={body} x1="0" x2="1">
          <stop offset="0" stopColor="#06b6d4" />
          <stop offset="0.5" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id={stripe} x1="0" x2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.5" stopColor="#f0f9ff" />
          <stop offset="1" stopColor="#fef3c7" />
        </linearGradient>
      </defs>
      <path d="M 65 60 L 45 50 L 50 60 L 45 70 Z" fill={`url(#${body})`} opacity="0.9" />
      <ellipse cx="105" cy="60" rx="40" ry="14" fill={`url(#${body})`} />
      <line x1="70" y1="60" x2="135" y2="60" stroke={`url(#${stripe})`} strokeWidth="2.5" opacity="0.9" />
      <path d="M 95 47 Q 105 40 115 47" fill="rgba(34,211,238,0.5)" stroke="#22d3ee" strokeWidth="0.5" />
      <circle cx="135" cy="58" r="2.5" fill="#1a1a1a" />
      <circle cx="136" cy="57" r="1" fill="#ffffff" />
    </svg>
  );
}

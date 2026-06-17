'use client';

import { useId } from 'react';
import type { GrowthRecord } from '@/lib/api/mock';

interface GrowthChartProps {
  records: GrowthRecord[];
  metric?: 'growth' | 'health' | 'nutrition' | 'mood';
  height?: number;
}

const METRIC_LABEL: Record<NonNullable<GrowthChartProps['metric']>, string> = {
  growth: 'Growth',
  health: 'Health',
  nutrition: 'Nutrition',
  mood: 'Mood',
};

const METRIC_COLOR: Record<NonNullable<GrowthChartProps['metric']>, string> = {
  growth: '#7dd3fc',
  health: '#4ade80',
  nutrition: '#fb923c',
  mood: '#a78bfa',
};

/**
 * Native SVG growth chart — line + area gradient + daily data dots.
 * No chart library (per spec).
 */
export function GrowthChart({ records, metric = 'growth', height = 200 }: GrowthChartProps) {
  const uid = useId().replace(/:/g, '_');
  const areaId = `growthArea_${uid}`;
  const lineId = `growthLine_${uid}`;

  const W = 600;
  const H = height;
  const PAD = 24;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-secondary text-xs font-light">
        No data yet
      </div>
    );
  }

  const xs = records.map((_, i) => PAD + (i / Math.max(1, records.length - 1)) * innerW);
  const ys = records.map((r) => PAD + (1 - r[metric] / 100) * innerH);
  const color = METRIC_COLOR[metric];

  // Build SVG path strings
  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const areaPath =
    `M ${xs[0].toFixed(1)} ${(H - PAD).toFixed(1)} ` +
    xs.map((x, i) => `L ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ') +
    ` L ${xs[xs.length - 1].toFixed(1)} ${(H - PAD).toFixed(1)} Z`;

  // Y axis labels
  const yTicks = [0, 50, 100];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.4" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y grid */}
      {yTicks.map((v) => {
        const y = PAD + (1 - v / 100) * innerH;
        return (
          <g key={v}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
            <text x={PAD - 6} y={y + 4} fontSize="9" fill="#94a3b8" textAnchor="end">
              {v}
            </text>
          </g>
        );
      })}

      {/* Area */}
      <path d={areaPath} fill={`url(#${areaId})`} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />

      {/* Dots */}
      {xs.map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={ys[i]}
          r={i === xs.length - 1 ? 4 : 2.5}
          fill={color}
          stroke="#0a1f2e"
          strokeWidth="1.5"
        />
      ))}

      {/* X axis labels — first, middle, last */}
      <text x={xs[0]} y={H - 6} fontSize="9" fill="#94a3b8" textAnchor="start">
        {records[0].date.slice(5)}
      </text>
      {records.length > 2 && (
        <text
          x={xs[Math.floor(records.length / 2)]}
          y={H - 6}
          fontSize="9"
          fill="#94a3b8"
          textAnchor="middle"
        >
          {records[Math.floor(records.length / 2)].date.slice(5)}
        </text>
      )}
      <text
        x={xs[xs.length - 1]}
        y={H - 6}
        fontSize="9"
        fill="#94a3b8"
        textAnchor="end"
      >
        {records[records.length - 1].date.slice(5)}
      </text>

      {/* Title in upper-left */}
      <text x={PAD} y={PAD - 8} fontSize="10" fill="#94a3b8" fontWeight="300">
        {METRIC_LABEL[metric]}
      </text>
    </svg>
  );
}

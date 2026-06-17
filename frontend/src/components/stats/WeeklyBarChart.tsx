'use client';

import { useId } from 'react';
import type { WeeklyDatum } from '@/lib/api/mock';

interface WeeklyBarChartProps {
  data: WeeklyDatum[];
  metric?: 'feed' | 'waterChange' | 'treat';
  height?: number;
}

const METRIC_COLOR: Record<NonNullable<WeeklyBarChartProps['metric']>, string> = {
  feed: '#7dd3fc',
  waterChange: '#4ade80',
  treat: '#fb923c',
};

const METRIC_LABEL: Record<NonNullable<WeeklyBarChartProps['metric']>, string> = {
  feed: 'Feeds',
  waterChange: 'Water Changes',
  treat: 'Treats',
};

/**
 * Native SVG bar chart for weekly activity.
 * Each bar has glow effect + label below.
 */
export function WeeklyBarChart({ data, metric = 'feed', height = 180 }: WeeklyBarChartProps) {
  const uid = useId().replace(/:/g, '_');
  const gradId = `barGrad_${uid}`;
  const W = 600;
  const H = height;
  const PAD_BOTTOM = 28;
  const PAD_TOP = 24;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const max = Math.max(1, ...data.map((d) => d[metric]));
  const barW = (W / data.length) * 0.6;
  const slot = W / data.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={METRIC_COLOR[metric]} stopOpacity="0.95" />
          <stop offset="1" stopColor={METRIC_COLOR[metric]} stopOpacity="0.5" />
        </linearGradient>
      </defs>

      <text x={0} y={PAD_TOP - 8} fontSize="10" fill="#94a3b8" fontWeight="300">
        {METRIC_LABEL[metric]} (max {max})
      </text>

      {data.map((d, i) => {
        const h = (d[metric] / max) * innerH;
        const x = i * slot + (slot - barW) / 2;
        const y = PAD_TOP + (innerH - h);
        return (
          <g key={d.day}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={3}
              fill={`url(#${gradId})`}
              style={{ filter: `drop-shadow(0 0 6px ${METRIC_COLOR[metric]}80)` }}
            >
              <title>
                {d.day}: {d[metric]}
              </title>
            </rect>
            <text
              x={i * slot + slot / 2}
              y={H - PAD_BOTTOM + 14}
              fontSize="9"
              fill="#94a3b8"
              textAnchor="middle"
            >
              {d.day}
            </text>
            <text
              x={i * slot + slot / 2}
              y={y - 4}
              fontSize="9"
              fill={METRIC_COLOR[metric]}
              textAnchor="middle"
            >
              {d[metric]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

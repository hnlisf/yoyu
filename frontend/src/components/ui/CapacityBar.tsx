'use client';

import React from 'react';

// v9.0 REQ-6: Capacity mapping by tank size
const CAPACITY_MAP: Record<string, number> = {
  small: 6,
  medium: 12,
  large: 30,
};

interface CapacityBarProps {
  size: 'small' | 'medium' | 'large';
  current: number;
  className?: string;
}

/**
 * v9.0 CapacityBar — X/6 | X/12 | X/30 progress bar.
 * Shows red when full, blue otherwise.
 */
export function CapacityBar({ size, current, className = '' }: CapacityBarProps) {
  const capacity = CAPACITY_MAP[size] ?? 12;
  const pct = Math.min((current / capacity) * 100, 100);
  const isFull = current >= capacity;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-glass rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${isFull ? 'bg-red-500' : 'bg-brand-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono tabular-nums ${isFull ? 'text-red-500 font-bold' : 'text-text-secondary'}`}>
        {current}/{capacity}
      </span>
      {isFull && (
        <span className="text-[10px] text-red-500 font-light">已满</span>
      )}
    </div>
  );
}

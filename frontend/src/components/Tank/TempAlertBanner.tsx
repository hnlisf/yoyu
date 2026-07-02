'use client';

import React from 'react';

interface TempAlertBannerProps {
  temperature: number;
  threshold?: number;
  className?: string;
}

/**
 * v9.0 REQ-7: TempAlertBanner — red alert bar when water temperature exceeds safe range.
 * Shown on tank detail page. Prompts user to change water.
 */
export function TempAlertBanner({ temperature, threshold, className = '' }: TempAlertBannerProps) {
  return (
    <div className={`bg-red-500/80 text-white px-4 py-2 flex items-center gap-2 rounded-lg text-sm ${className}`}>
      <span className="text-lg">🚨</span>
      <span className="flex-1">
        水温 {temperature.toFixed(1)}°C 超过适应温度{threshold ? `（阈值 ${threshold}°C）` : ''}，请换水！
      </span>
      <span className="text-xs opacity-70">点击下方"换水"按钮</span>
    </div>
  );
}

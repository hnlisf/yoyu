'use client';

import React, { useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface HeaterSwitchProps {
  tankId: string;
  heaterOn: boolean;
  currentTemp: number;
  cityTemp: number;
  className?: string;
}

/**
 * v6.0 HeaterSwitch — toggle tank heater, show temperatures.
 */
export function HeaterSwitch({
  tankId,
  heaterOn: initialHeaterOn,
  currentTemp,
  cityTemp,
  className = '',
}: HeaterSwitchProps) {
  const [heaterOn, setHeaterOn] = useState(initialHeaterOn);
  const [loading, setLoading] = useState(false);
  const [temp, setTemp] = useState(currentTemp);
  const [ctTemp, setCtTemp] = useState(cityTemp);

  const toggleHeater = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ heaterOn: boolean; temp?: number; cityTemp?: number }>(
        `/api/fish-tanks/${tankId}/heater`,
        { method: 'POST' },
      );
      setHeaterOn(res.heaterOn);
      if (res.temp != null) setTemp(res.temp);
      if (res.cityTemp != null) setCtTemp(res.cityTemp);
    } catch {
      // toggle fails silently, revert UI
      setHeaterOn(!heaterOn);
    } finally {
      setLoading(false);
    }
  }, [tankId, heaterOn]);

  const refresh = useCallback(async () => {
    try {
      const tk = await api<{ temp: number; cityTemp: number; heaterOn: boolean }>(
        `/api/fish-tanks/${tankId}`,
      );
      setTemp(tk.temp);
      setCtTemp(tk.cityTemp);
      setHeaterOn(tk.heaterOn);
    } catch {}
  }, [tankId]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary font-light">加热器</span>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="text-[10px] text-accent/60 hover:text-accent transition"
            title="刷新温度"
          >
            ↻
          </button>
          <button
            onClick={toggleHeater}
            disabled={loading}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all
              ${heaterOn
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-glass/30 text-text-secondary border border-glass-border'
              }
              ${loading ? 'opacity-50' : 'hover:opacity-80'}
            `}
          >
            {loading ? '...' : heaterOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
      <div className="flex gap-3 text-[10px] text-text-secondary font-light">
        <span>缸温 {temp.toFixed(1)}°</span>
        <span>城市 {ctTemp.toFixed(1)}°</span>
      </div>
    </div>
  );
}

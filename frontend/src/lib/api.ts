'use client';

import { useEffect, useState } from 'react';

const ERROR_MESSAGE_MAP: Array<{ pattern: RegExp; zh: string; en: string }> = [
  { pattern: /too soon to feed/i, zh: '还没到投喂时间呢，再等等吧~', en: 'Not time to feed yet, please wait a bit~' },
  { pattern: /fish tank not found/i, zh: '鱼缸不存在或已被删除', en: 'Tank not found or has been deleted' },
  { pattern: /fish not found/i, zh: '鱼不存在或已被移除', en: 'Fish not found or has been removed' },
  { pattern: /fish species not found/i, zh: '鱼种不存在', en: 'Fish species not found' },
  { pattern: /lat\/lon must be numbers/i, zh: '位置参数错误', en: 'Invalid location parameters' },
  { pattern: /userId required/i, zh: '用户信息缺失', en: 'User information missing' },
];

/** v10.1.3-w1: structured error that preserves raw response data for callers to consume error_code etc. */
export class ApiError extends Error {
  data: any;
  constructor(message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.data = data;
  }
}

interface HumanizedResult {
  message: string;
  data?: any;
}

function humanizeError(responseText: string): HumanizedResult {
  let message = responseText;
  let parsed: any = null;
  try {
    parsed = JSON.parse(responseText);
    message = parsed.message || message;
  } catch {}

  // v10.1.3-w1: if the backend returned an error_code, use it for the friendly message
  // but preserve the raw parsed data so callers can consume remainingHours etc.
  if (parsed && parsed.error_code) {
    return {
      message: `[${parsed.error_code}] ${message}`,
      data: parsed,
    };
  }

  for (const entry of ERROR_MESSAGE_MAP) {
    if (entry.pattern.test(message)) return { message: entry.zh };
  }
  if (/[\u4e00-\u9fff]/.test(message)) return { message };
  if (/^[a-zA-Z\s.!?,:;()]+$/.test(message) && message.length < 200) {
    return { message: `操作失败：${message}` };
  }
  return { message: '操作失败，请稍后再试' };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const rawText = await res.text();
    const { message: friendly, data } = humanizeError(rawText);
    console.error(`[API Error ${res.status}] ${path}: ${rawText.slice(0, 200)}`);
    if (typeof window !== 'undefined' && window.location.pathname.includes('/stats')) {
      console.warn(`[API Silent Fallback] ${path} → stats mock data used`);
      return null as unknown as T;
    }
    throw new ApiError(friendly, data);
  }
  return res.json() as Promise<T>;
}

export interface FishSpecies {
  id: string;
  name: string;
  description: string;
  tempMin: number;
  tempMax: number;
  phMin: number;
  phMax: number;
  growthDays: number;
  feedFreq: 'daily' | 'twice_daily' | 'every_2_days';
  stages: Array<{ name: string; label: Record<string, string>; days: number }>;
  color: string;
  isDefault: boolean;
  userCustomized?: boolean; // v9.0
  feedRefuseHint?: string;
  variant?: string;
  visualVariant?: { color: string; pattern: string; body: string }; // v9.1
}

export interface Fish {
  id: string;
  tankId: string;
  speciesId: string;
  name: string;
  instanceId?: string; // v9.0
  adoptedDays?: number; // v9.0: computed days since adoption
  status?: string; // v9.0: healthy|subhealthy|danger|hungry|dead
  birthday: string;
  stage: 'fry' | 'juvenile' | 'subadult' | 'adult';
  growth: number;
  health: number;
  nutrition: number;
  lastFedAt: string | null;
  species?: FishSpecies;
  feedRecords?: Array<{ id: string; fedAt: string; amount: string }>;
}

export interface FishTank {
  id: string;
  userId: string;
  name: string;
  size: 'small' | 'medium' | 'large';
  temp: number;
  cleanliness: number;
  oxygen: number;
  ph: number;
  cityTemp: number;
  heaterOn: boolean;
  location?: string; // v10.0: per-tank city
  temperature?: number; // v9.0
  weatherSync?: { city: string; currentTemp: number; lastSyncAt: string } | null; // v9.0
  tempAlert?: { isOverTemp: boolean; threshold: number | null; dismissedAt: string } | null; // v9.0
  fishCount?: number; // v9.0: computed by backend
  fish?: Fish[];
}

export interface Reminder {
  id: string;
  userId: string;
  type: 'feed' | 'water_change' | 'clean';
  titleI18n: string | Record<string, string>;
  dueAt: string;
  isDone: boolean;
  title?: string;
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  weatherCode: number;
  description: string;
  windSpeed: number;
  source: string;
}

export interface LocationInfo {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  timezone: string;
  source: 'ipapi' | 'fallback';
}

export interface FeedingAdvice {
  speciesId: string;
  speciesName: string;
  tempSuitability: 'ideal' | 'ok' | 'poor';
  recommendation: string;
  actionItems: string[];
}

export interface CityItem {
  id: string;
  nameZh: string;
  nameEn: string;
  nameJa: string;
  lat: number;
  lon: number;
  country: string;
  continent: string;
}

export { api };

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!path) return;
    setLoading(true);
    setError(null);
    api<T>(path)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);
  return { data, error, loading, refetch: () => path && api<T>(path).then(setData) };
}

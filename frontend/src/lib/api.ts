'use client';

import { useEffect, useState } from 'react';

/**
 * Map backend error messages → user-friendly Chinese text.
 * The backend stays untouched; all error translation happens here.
 */
const ERROR_MESSAGE_MAP: Array<{ pattern: RegExp; zh: string; en: string }> = [
  {
    pattern: /too soon to feed/i,
    zh: '还没到投喂时间呢，再等等吧~',
    en: 'Not time to feed yet, please wait a bit~',
  },
  {
    pattern: /fish tank not found/i,
    zh: '鱼缸不存在或已被删除',
    en: 'Tank not found or has been deleted',
  },
  {
    pattern: /fish not found/i,
    zh: '鱼不存在或已被移除',
    en: 'Fish not found or has been removed',
  },
  {
    pattern: /fish species not found/i,
    zh: '鱼种不存在',
    en: 'Fish species not found',
  },
  {
    pattern: /lat\/lon must be numbers/i,
    zh: '位置参数错误',
    en: 'Invalid location parameters',
  },
  {
    pattern: /userId required/i,
    zh: '用户信息缺失',
    en: 'User information missing',
  },
];

/**
 * Try to parse a JSON error response from the backend and produce a
 * user-friendly message. Falls back to the raw text if it can't be parsed.
 */
function humanizeError(responseText: string): string {
  // Attempt to parse JSON (NestJS errors are JSON)
  let message = responseText;
  try {
    const parsed = JSON.parse(responseText);
    message = parsed.message || responseText;
  } catch {
    // Not JSON — use raw text
  }

  // Check against known patterns
  for (const entry of ERROR_MESSAGE_MAP) {
    if (entry.pattern.test(message)) {
      // For now return Chinese (the app's primary audience).
      // In a full i18n solution, we'd detect the current locale.
      return entry.zh;
    }
  }

  // If message already contains Chinese (e.g. backend user-friendly hints),
  // return it directly — it's already a readable user-facing message
  if (/[\u4e00-\u9fff]/.test(message)) {
    return message;
  }

  // If the parsed message looks like English, give a friendly fallback
  if (/^[a-zA-Z\s.!?,:;()]+$/.test(message) && message.length < 200) {
    return `操作失败：${message}`;
  }

  // Last resort: generic error
  return '操作失败，请稍后再试';
}

// Helper: client-side API calls go to /api (rewritten by Next.js to backend)
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const rawText = await res.text();
    throw new Error(humanizeError(rawText));
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
  feedRefuseHint?: string;
}

export interface Fish {
  id: string;
  tankId: string;
  speciesId: string;
  name: string;
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
  fish?: Fish[];
}

export interface Reminder {
  id: string;
  userId: string;
  type: 'feed' | 'water_change' | 'clean';
  titleI18n: string | Record<string, string>;
  dueAt: string;
  isDone: boolean;
  // backend may also return the resolved title:
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

// Re-exported for convenience
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

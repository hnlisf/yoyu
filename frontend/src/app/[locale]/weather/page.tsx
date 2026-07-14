'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { api, WeatherData, FeedingAdvice, LocationInfo, CityItem } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

const USER_ID = 'demo-user';
const LOC_KEY = 'fishgrow.location';
const CITY_KEY = 'fishgrow.city';

function getStoredLocation(): LocationInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOC_KEY);
    return raw ? (JSON.parse(raw) as LocationInfo) : null;
  } catch {
    return null;
  }
}

export default function WeatherPage() {
  const t = useTranslations('weather');
  const { locale } = useLocale();
  const [loc, setLoc] = useState<LocationInfo | null>(null);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('changsha');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [wLoading, setWLoading] = useState(false);
  const [wError, setWError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<FeedingAdvice[] | null>(null);
  const [aLoading, setALoading] = useState(false);

  // 1) Load cities list
  useEffect(() => {
    api<CityItem[]>('/api/cities')
      .then(setCities)
      .catch(() => {}); // silent fail — cities are static anyway
  }, []);

  // 2) Resolve location: cached → IP-based → changsha fallback
  useEffect(() => {
    const cached = getStoredLocation();
    if (cached) { setLoc(cached); return; }
    api<LocationInfo>('/api/location')
      .then((l) => {
        setLoc(l);
        try { localStorage.setItem(LOC_KEY, JSON.stringify(l)); } catch {}
        // auto-detect city from location
        if (l.city) {
          const cityId = l.city.toLowerCase();
          setSelectedCity(cityId);
          try { localStorage.setItem(CITY_KEY, cityId); } catch {}
        }
      })
      .catch(() => {
        const fb: LocationInfo = {
          ip: '0.0.0.0', country: 'CN', countryCode: 'CN', region: 'Hunan',
          city: 'Changsha', lat: 28.2282, lon: 112.9388, timezone: 'Asia/Shanghai', source: 'fallback',
        };
        setLoc(fb);
        try { localStorage.setItem(LOC_KEY, JSON.stringify(fb)); } catch {}
      });
  }, []);

  // 3) Load user city preference
  useEffect(() => {
    api<{ city?: string }>(`/api/user/preferences?userId=${USER_ID}`)
      .then((pref) => {
        if (pref?.city) setSelectedCity(pref.city);
      })
      .catch(() => {});
  }, []);

  // 4) Fetch weather by city
  const fetchWeather = useCallback(async (city: string) => {
    setWLoading(true);
    setWError(null);
    try {
      const data = await api<WeatherData>(`/api/weather?city=${encodeURIComponent(city)}`);
      setWeather(data);
    } catch (e: any) {
      setWError(e.message || '获取天气失败');
      // Keep previous cached weather if available
    } finally {
      setWLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCity) fetchWeather(selectedCity);
  }, [selectedCity, fetchWeather]);

  // 5) Fetch feeding advice
  useEffect(() => {
    setALoading(true);
    api<FeedingAdvice[]>(`/api/feeding-advice?userId=${USER_ID}&lang=${locale}`)
      .then(setAdvice)
      .catch(() => {})
      .finally(() => setALoading(false));
  }, [locale]);

  const onCityChange = (cityId: string) => {
    setSelectedCity(cityId);
    try { localStorage.setItem(CITY_KEY, cityId); } catch {}
    // Persist to backend
    api('/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({ userId: USER_ID, city: cityId }),
    }).catch(() => {});
  };

  const selectedCityItem = cities.find((c) => c.id === selectedCity);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-water-600">{t('title')}</h1>

      {/* City selector + refresh */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <select
            className="input w-full"
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.nameZh} {c.nameEn}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fetchWeather(selectedCity)}
          disabled={wLoading}
          className="btn-secondary text-sm px-3 py-2 whitespace-nowrap"
        >
          {wLoading ? '⏳' : '🔄'} {t('refresh') || '刷新'}
        </button>
      </div>

      {/* Location badge */}
      {loc && (
        <div className="text-sm text-water-500 flex items-center gap-2">
          <span>📍</span>
          <span>
            {t('locationTitle')}:{' '}
            <span className="font-medium text-water-700">
              {[loc.city, loc.region, loc.country].filter(Boolean).join(', ') || loc.ip}
            </span>
            {loc.source === 'fallback' && (
              <span className="ml-2 text-xs text-water-400">({t('fallback')})</span>
            )}
          </span>
        </div>
      )}

      {/* Weather card */}
      {wLoading && !weather ? (
        <p>{t('loading')}</p>
      ) : weather && (
        <div className="card bg-water-gradient">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-5xl font-light text-water-600">{weather.temp}°</p>
              <p className="text-water-500 mt-1">{weather.description}</p>
              <p className="text-xs text-water-400 mt-0.5">
                {selectedCityItem?.nameZh || selectedCity}
                {weather.source === 'live' && <span className="ml-1">● {t('live')}</span>}
              </p>
            </div>
            <div className="text-right text-sm space-y-1 text-water-600">
              <p>💧 {t('humidity')}: {weather.humidity}%</p>
              <p>💨 {t('wind')}: {weather.windSpeed} m/s</p>
              <p className="text-xs text-water-400">{t('feels')}: {weather.feelsLike}°</p>
            </div>
          </div>
        </div>
      )}

      {/* w4: friendly error toast for weather failures */}
      {wError && (
        <div className="card bg-amber-50 border border-amber-200 text-amber-700 text-sm p-3">
          {wError}
        </div>
      )}

      {/* Feeding advice */}
      <div>
        <h2 className="font-semibold text-water-600 mb-3">{t('adviceTitle')}</h2>
        {aLoading ? <p>{t('loading')}</p> : advice && advice.length === 0 && (
          <p className="text-water-500 text-sm">{t('noFishHint')}</p>
        )}
        <div className="space-y-3">
          {advice?.map((a, i) => (
            <div key={i} className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-water-600">{a.speciesName}</p>
                <span className={
                  a.tempSuitability === 'ideal' ? 'badge-ideal' :
                  a.tempSuitability === 'ok' ? 'badge-ok' : 'badge-poor'
                }>
                  {a.tempSuitability === 'ideal' ? t('ideal') : a.tempSuitability === 'ok' ? t('ok') : t('poor')}
                </span>
              </div>
              <p className="text-sm text-water-600 mb-2">{a.recommendation}</p>
              {a.actionItems.length > 0 && (
                <ul className="text-sm text-water-500 space-y-1">
                  {a.actionItems.map((act, j) => (
                    <li key={j}>• {act}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

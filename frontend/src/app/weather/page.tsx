'use client';

import { useTranslations } from 'next-intl';
import { useApi, WeatherData, FeedingAdvice } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

export default function WeatherPage() {
  const t = useTranslations('weather');
  const { locale } = useLocale();
  const { data: weather, loading: wLoading } = useApi<WeatherData>('/api/weather?lat=39.9&lon=116.4');
  const { data: advice, loading: aLoading } = useApi<FeedingAdvice[]>(`/api/feeding-advice?userId=demo-user&lang=${locale}`);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-water-600">{t('title')}</h1>

      {wLoading ? <p>Loading…</p> : weather && (
        <div className="card bg-water-gradient">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-5xl font-light text-water-600">{weather.temp}°</p>
              <p className="text-water-500 mt-1">{weather.description}</p>
            </div>
            <div className="text-right text-sm space-y-1 text-water-600">
              <p>💧 {t('humidity')}: {weather.humidity}%</p>
              <p>💨 {t('wind')}: {weather.windSpeed} m/s</p>
              <p className="text-xs text-water-400">{t('feels')}: {weather.feelsLike}°</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-water-600 mb-3">{t('adviceTitle')}</h2>
        {aLoading ? <p>Loading…</p> : advice && advice.length === 0 && (
          <p className="text-water-500 text-sm">Add fish to get personalized advice</p>
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
              <ul className="text-sm text-water-500 space-y-1">
                {a.actionItems.map((act, j) => (
                  <li key={j}>• {act}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api, FishTank, Fish, WeatherData } from '@/lib/api';
import { FishAvatar } from '@/components/fish';
import { slugToVariant } from '@/components/fish/types';
import { TankStage } from '@/components/Tank/TankStage';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Toast } from '@/components/ui/Toast';
import { Icon } from '@/components/ui/Icon';
import { HeaterSwitch } from '@/components/Tank/HeaterSwitch';
import { useTranslateTankName } from '@/lib/i18n/tankName';
import { BottomDrawer } from '@/components/BottomDrawer';

interface PageProps {
  params: { id: string };
}

/**
 * Tank detail page — v6.0: tank stage + status bars + water quality + heater + weather
 * TankStage internally wraps FeedingProvider; we use feedRef for external control.
 */
export default function TankDetailPage({ params }: PageProps) {
  const { id } = params;

  return <TankPageContent tankId={id} />;
}

function TankPageContent({ tankId }: { tankId: string }) {
  const t = useTranslations('tankDetail');
  const tf = useTranslations('fish.stage');
  const tCommon = useTranslations('common');
  const tName = useTranslateTankName();

  // Ref to trigger feeding animation inside TankStage
  const feedRef = useRef<((count?: number, fishIds?: string[]) => void) | null>(null);

  const [tank, setTank] = useState<FishTank | null>(null);
  const [fishList, setFishList] = useState<Fish[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Heater & weather state
  const [heaterOn, setHeaterOn] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [heaterToggling, setHeaterToggling] = useState(false);

  const load = async () => {
    try {
      const tk = await api<FishTank>(`/api/fish-tanks/${tankId}`);
      setTank(tk);
      const fl = await api<Fish[]>(`/api/fish?tankId=${tankId}`);
      setFishList(fl);
    } catch (e: any) {
      setToast('Load failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const w = await api<WeatherData>(`/api/weather?tankId=${tankId}`);
      setWeather(w);
    } catch {
      // Weather may not be available — silently ignore
    } finally {
      setWeatherLoading(false);
    }
  }, [tankId]);

  useEffect(() => {
    load();
  }, [tankId]);

  // Sync heater state from tank data
  useEffect(() => {
    if (tank) {
      setHeaterOn(tank.heaterOn ?? false);
    }
  }, [tank]);
  // Fetch weather on mount
  useEffect(() => {
    loadWeather();
  }, [tankId, loadWeather]);

  const toggleHeater = async (_tankId: string, newState: boolean) => {
    setHeaterToggling(true);
    try {
      await api(`/api/fish-tanks/${tankId}/heater`, {
        method: 'POST',
        body: JSON.stringify({ heaterOn: newState }),
      });
      setHeaterOn(newState);
      setToast(newState ? 'Heater turned ON' : 'Heater turned OFF');
    } catch (e: any) {
      setToast('Heater toggle failed: ' + e.message);
    } finally {
      setHeaterToggling(false);
    }
  };

  const feedAll = async () => {
    if (!fishList.length) return;
    setBusy(true);

    // BUG-3 fix: call API first, animate only on success (ADR-005)
    const results = await Promise.allSettled(
      fishList.map((f) =>
        api(`/api/fish/${f.id}/feed`, {
          method: 'POST',
          body: JSON.stringify({ amount: 'normal' }),
        })
      )
    );

    const successes = results
      .map((r, i) => (r.status === 'fulfilled' ? fishList[i].id : null))
      .filter((id): id is string => id !== null);
    const failures = results.filter((r) => r.status === 'rejected');

    if (failures.length > 0 && successes.length === 0) {
      // All failed — no animation, show error
      const firstError = (failures[0] as PromiseRejectedResult).reason;
      setToast(firstError?.message || '喂食失败，请稍后再试');
      setBusy(false);
      return;
    }

    if (successes.length > 0) {
      // Trigger animation only for successfully fed fish
      const count = 3 + Math.floor(Math.random() * 5);
      feedRef.current?.(count, successes);

      if (failures.length > 0) {
        // Partial success — mixed toast
        setToast(`${successes.length}条鱼喂食成功，${failures.length}条失败`);
      } else {
        setToast(t('feedAllDone'));
      }
      await load();
    }

    setBusy(false);
  };

  const waterChange = async () => {
    setBusy(true);
    try {
      await api(`/api/fish-tanks/${tankId}/tick`, { method: 'POST' });
      setToast(t('waterChanged'));
      await load();
    } catch (e: any) {
      setToast('Water change failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // Determine if water temp is abnormal (outside typical range 22-28°C)
  const isTempAbnormal = tank ? (tank.temp < 20 || tank.temp > 30) : false;
  // If we have a fish with species, check against species temp range
  const speciesTempAbnormal = fishList.some((f) => {
    if (!f.species?.tempMin || !f.species?.tempMax) return false;
    return tank ? (tank.temp < f.species.tempMin || tank.temp > f.species.tempMax) : false;
  });
  const showTempWarning = isTempAbnormal || speciesTempAbnormal;

  if (loading) {
    return <p className="text-text-secondary text-sm font-light">{tCommon('loading')}</p>;
  }

  if (!tank) {
    return (
      <GlassCard>
        <p className="text-text-primary text-sm">{t('notFound')}</p>
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col justify-between h-screen max-h-screen overflow-hidden">
      {/* Header — shrinks to fit */}
      <header className="flex items-baseline justify-between shrink-0 px-1 pt-2 pb-1">
        <div>
          <Link
            href="/tanks"
            className="text-[11px] font-light text-accent tracking-wide inline-block mb-2"
          >
            ← {tCommon('back')}
          </Link>
          <h1 className="text-2xl font-light text-text-primary tracking-wide">
            {tName(tank.name)}
          </h1>
          <p className="text-xs text-text-secondary font-light mt-1">
            {tkSize(tank.size, t)}
          </p>
        </div>
      </header>

      {/* Main stage — flex-none for natural height, no 60vh cap */}
      <div className="flex-none min-h-0 flex flex-col sm:flex-row gap-0">
        {/* Swim stage — auto-height, no 60vh cap */}
        <div className="flex-[6] min-h-0 sm:max-h-none">
          <TankStage fishList={fishList} feedRef={feedRef} />
        </div>

        {/* Desktop side panel — controls always visible on sm+ */}
        <div className="hidden sm:flex flex-[4] min-h-0 flex-col overflow-y-auto p-3 space-y-3">
          {controlsContent()}
        </div>
      </div>

      {/* Mobile BottomDrawer — wraps all controls */}
      <div className="sm:hidden shrink-0">
        <BottomDrawer
          tabs={[
            {
              key: 'status',
              label: t('statusTitle'),
              content: <div className="space-y-3">{controlsContent()}</div>,
            },
          ]}
          defaultExpanded={false}
        />
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );

  /** Shared controls content for desktop side panel & mobile drawer */
  function controlsContent() {
    return (
      <>
        {/* Status bars */}
        <GlassCard className="space-y-3">
          <h2 className="text-sm font-normal text-text-primary">{t('statusTitle')}</h2>
          <ProgressBar value={tank!.cleanliness} variant="accent" showLabel label={t('cleanliness')} />
          <ProgressBar value={tank!.oxygen} variant="health" showLabel label={t('oxygen')} />
        </GlassCard>

        {/* Water quality cards */}
        <div className="grid grid-cols-3 gap-2">
          <GlassCard
            className={`text-center py-3 ${
              showTempWarning ? 'border border-yellow-500/50' : ''
            }`}
          >
            <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide">
              {t('temp')}
            </p>
            <p
              className={`text-lg mt-1 font-light tabular-nums ${
                showTempWarning ? 'text-red-400' : 'text-accent'
              }`}
            >
              {tank!.temp.toFixed(1)}°
            </p>
            {showTempWarning && (
              <p className="text-[9px] text-red-400/80 mt-0.5">异常水温</p>
            )}
          </GlassCard>

          <GlassCard className="text-center py-3">
            <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide">pH</p>
            <p className="text-lg text-accent mt-1 font-light tabular-nums">
              {tank!.ph.toFixed(1)}
            </p>
          </GlassCard>

          <GlassCard className="text-center py-3">
            <p className="text-[10px] text-text-secondary font-light uppercase tracking-wide">
              {t('fish')}
            </p>
            <p className="text-lg text-accent mt-1 font-light tabular-nums">
              {fishList.length}
            </p>
          </GlassCard>
        </div>

        {/* Heater + Weather row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-secondary font-light uppercase tracking-wide">加热器</span>
            <HeaterSwitch
              tankId={tankId}
              heaterOn={heaterOn}
              onToggle={toggleHeater}
              disabled={heaterToggling}
            />
          </div>

          {weather && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary font-light">
              <span>🌡️</span>
              <span>城市 {weather.temp}°</span>
              <span className="text-[10px] opacity-60">{weather.description}</span>
            </div>
          )}

          <button
            type="button"
            onClick={loadWeather}
            disabled={weatherLoading}
            className="inline-flex items-center gap-1 text-[10px] text-accent/70 hover:text-accent transition ml-auto"
          >
            <span className={weatherLoading ? 'animate-spin' : ''}>🔄</span>
            刷新天气
          </button>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="accent" onClick={feedAll} disabled={busy || !fishList.length}>
            <Icon name="feed" size={14} /> {t('feedAll')}
          </Button>
          <Button variant="primary" onClick={waterChange} disabled={busy}>
            <Icon name="water" size={14} /> {t('waterChange')}
          </Button>
          <Button variant="ghost" disabled>
            <Icon name="treat" size={14} /> {t('treat')}
          </Button>
        </div>

        {/* Species chips */}
        {fishList.length > 0 && (
          <GlassCard className="space-y-2">
            <h2 className="text-sm font-normal text-text-primary">{t('fish')}</h2>
            <div className="space-y-1.5">
              {fishList.map((f) => {
                const variant = slugToVariant(f.species?.name ?? f.species?.id);
                return (
                  <Link
                    key={f.id}
                    href={`/growth/${f.id}`}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-glass transition"
                  >
                    <FishAvatar variant={variant} stage={f.stage} size={40} animated={false} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {f.name || tf(f.stage)}
                      </p>
                      <p className="text-[10px] font-light text-text-secondary">
                        {tf(f.stage)} · {Math.round(f.growth)}%
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Tag variant="success">
                        <Icon name="health" size={11} /> {Math.round(f.health)}
                      </Tag>
                      <Tag variant="gold">
                        <Icon name="feed" size={11} /> {Math.round(f.nutrition)}
                      </Tag>
                    </div>
                  </Link>
                );
              })}
            </div>
          </GlassCard>
        )}
      </>
    );
  }
}

function tkSize(
  size: 'small' | 'medium' | 'large',
  t: ReturnType<typeof useTranslations>,
): string {
  return t('sizeLabel', {
    size: size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L',
  });
}

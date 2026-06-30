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
import { CapacityBar } from '@/components/ui/CapacityBar';
import { TempAlertBanner } from '@/components/Tank/TempAlertBanner';

const USER_ID = 'demo-user';

interface PageProps {
  params: { id: string };
}

/**
 * Tank detail page — v9.0: tank stage + capacity bar + temp alert + water change
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

  const feedRef = useRef<((count?: number, fishIds?: string[]) => void) | null>(null);

  const [tank, setTank] = useState<FishTank | null>(null);
  const [fishList, setFishList] = useState<Fish[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
      // BUG-4 fix: 方案B 前端两跳 (ADR-001)
      // Step 1: Get user city preference
      const pref = await api<{ city?: string }>(`/api/user/preferences?userId=${USER_ID}`);
      const city = pref?.city || 'Beijing';
      const w = await api<WeatherData>(`/api/weather?city=${encodeURIComponent(city)}`);
      setWeather(w);

      await api(`/api/fish-tanks/${tankId}/temperature`, {
        method: 'PATCH',
        body: JSON.stringify({ outdoorTemp: w.temp }),
      });
    } catch {
      // Weather may not be available — silently ignore
    } finally {
      setWeatherLoading(false);
    }
  }, [tankId]);

  useEffect(() => {
    load();
  }, [tankId]);

  useEffect(() => {
    if (tank) {
      setHeaterOn(tank.heaterOn ?? false);
    }
  }, [tank]);

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
      const firstError = (failures[0] as PromiseRejectedResult).reason;
      setToast(firstError?.message || '喂食失败，请稍后再试');
      setBusy(false);
      return;
    }

    if (successes.length > 0) {
      const count = 3 + Math.floor(Math.random() * 5);
      feedRef.current?.(count, successes);

      if (failures.length > 0) {
        setToast(`${successes.length}条鱼喂食成功，${failures.length}条失败`);
      } else {
        setToast(t('feedAllDone'));
      }
      await load();
    }

    setBusy(false);
  };

  // v9.0 REQ-7: Change water — uses new endpoint that resets temp to 24°C + clears alert
  const waterChange = async () => {
    setBusy(true);
    try {
      const result = await api<{ id: string; temperature: number; heaterOn: boolean; cityTemp: number }>(
        `/api/fish-tanks/${tankId}/change-water`,
        { method: 'POST' }
      );
      setToast(`换水完成！水温已重置为 ${result.temperature}°C`);
      setHeaterOn(false);
      await load();
    } catch (e: any) {
      setToast('换水失败: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // v9.0 REQ-7: Check if water temperature is over safe range
  const isOverTemp = tank?.tempAlert?.isOverTemp === true;
  // Also check against fish species temp range
  const speciesTempAbnormal = fishList.some((f) => {
    if (!f.species?.tempMin || !f.species?.tempMax) return false;
    const currentTemp = tank?.temperature ?? tank?.temp;
    return currentTemp ? (currentTemp < f.species.tempMin || currentTemp > f.species.tempMax) : false;
  });
  const showTempWarning = isOverTemp || speciesTempAbnormal;

  // v9.0 REQ-6: compute capacity info
  const capacity = tank ? (tank.size === 'small' ? 6 : tank.size === 'medium' ? 12 : 30) : 12;
  const fishCount = fishList.length;

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
    <div className="flex flex-col justify-between h-screen max-h-screen overflow-hidden pb-40 sm:pb-0">
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
        {/* CapacityBar: shown in header on md+ (top horizontal) */}
        <div className="hidden md:block w-48">
          <div className="text-[9px] text-text-secondary uppercase tracking-wide mb-1">鱼缸容量</div>
          <CapacityBar size={tank!.size} current={fishCount} />
        </div>
      </header>

      {/* TempAlertBanner — shown at top on all breakpoints */}
      {showTempWarning && (
        <div className="shrink-0 px-1">
          <TempAlertBanner
            temperature={tank.temperature ?? tank.temp}
            threshold={fishList[0]?.species?.tempMax}
            className="py-1.5 text-xs"
          />
        </div>
      )}

      {/* Main stage + side panel — responsive layout, capped for pad viewport */}
      <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-0 max-h-[60vh] md:max-h-[80vh]">
        {/* Tank stage: responsive flex, capped to prevent overflow */}
        <div className="flex-[6] md:flex-[6] lg:flex-[6] xl:flex-[5] min-h-0 max-h-[60vh] md:max-h-[80vh] relative">
          <TankStage fishList={fishList} feedRef={feedRef} />
        </div>

        {/* Desktop sidebar: hidden on mobile, visible sm+ */}
        <div className="hidden sm:flex flex-[4] lg:flex-[4] xl:flex-[3] min-h-0 flex-col overflow-y-auto p-3 space-y-3">
          {sidebarContent()}
        </div>

        {/* xl info panel: extra column for large desktops */}
        <div className="hidden xl:flex flex-[2] min-h-0 flex-col overflow-y-auto p-3 space-y-3 border-l border-glass-border">
          {infoPanelContent()}
        </div>
      </div>

      {/* Mobile BottomDrawer: only on sm breakpoint */}
      <div className="sm:hidden shrink-0">
        <BottomDrawer
          tabs={[
            {
              key: 'status',
              label: t('statusTitle'),
              content: <div className="space-y-3">{sidebarContent()}</div>,
            },
          ]}
          defaultExpanded={false}
        />
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );

  /** Sidebar content: shared between sm/md/lg and mobile BottomDrawer */
  function sidebarContent() {
    return (
      <>
        {/* Capacity bar: visible on mobile (inside drawer); on md+ it's in header */}
        <div className="sm:hidden">
          <GlassCard className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-normal text-text-primary">鱼缸容量</h2>
              <span className="text-[10px] text-text-secondary">
                {fishCount >= capacity ? '🔴 已满' : '🟢 可添加'}
              </span>
            </div>
            <CapacityBar size={tank!.size} current={fishCount} />
          </GlassCard>
        </div>

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
              {(tank!.temperature ?? tank!.temp).toFixed(1)}°
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
            style={{ minWidth: 44, minHeight: 44, touchAction: 'manipulation' }}
          >
            <span className={weatherLoading ? 'animate-spin' : ''}>🔄</span>
            刷新天气
          </button>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="accent" onClick={feedAll} disabled={busy || !fishList.length}>
            <Icon name="feed" size={14} /> {t('feedAll')}
          </Button>
          <Button variant="primary" onClick={waterChange} disabled={busy}>
            <Icon name="water" size={14} /> 换水
          </Button>
        </div>

        {/* Water change button — also in sidebar on md+ */}
        {showTempWarning && (
          <Button variant="primary" onClick={waterChange} disabled={busy} className="w-full">
            <Icon name="water" size={16} /> 紧急换水（重置水温至24°C）
          </Button>
        )}

        {/* Species chips */}
        {fishList.length > 0 && (
          <GlassCard className="space-y-2 xl:hidden">
            <h2 className="text-sm font-normal text-text-primary">{t('fish')}</h2>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
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

  /** Info panel: shown on xl+ only — detailed fish stats */
  function infoPanelContent() {
    return (
      <>
        <h2 className="text-sm font-normal text-text-primary">鱼群详情</h2>
        {fishList.length === 0 ? (
          <p className="text-text-secondary text-xs font-light">暂无鱼</p>
        ) : (
          <div className="space-y-2">
            {fishList.map((f) => {
              const variant = slugToVariant(f.species?.name ?? f.species?.id);
              const adoptedDays = f.adoptedDays ?? Math.floor((Date.now() - new Date(f.birthday).getTime()) / 86400000);
              return (
                <Link
                  key={f.id}
                  href={`/growth/${f.id}`}
                  className="block p-2 rounded-xl hover:bg-glass transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FishAvatar variant={variant} stage={f.stage} size={32} animated={false} />
                    <div className="min-w-0">
                      <p className="text-xs text-text-primary truncate">{f.name || tf(f.stage)}</p>
                      <p className="text-[9px] text-text-secondary">{tf(f.stage)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-text-secondary">
                    <span>健康: {Math.round(f.health)}%</span>
                    <span>营养: {Math.round(f.nutrition)}%</span>
                    <span>成长: {Math.round(f.growth)}%</span>
                    <span>养殖: {adoptedDays}天</span>
                  </div>
                </Link>
              );
            })}
          </div>
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

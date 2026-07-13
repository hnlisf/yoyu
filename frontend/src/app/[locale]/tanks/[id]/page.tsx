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

  // v9.1 REQ-4: Rename state
  const [renamingFishId, setRenamingFishId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // v9.1 REQ-7: Temperature adjust job state
  const [tempJob, setTempJob] = useState<{
    fromTemp: number; toTemp: number; currentTemp: number;
    status: string; remainingSeconds: number; deltaPerMinute: number;
  } | null>(null);

  // v10.0 P0-1: Tank name inline edit
  const [editingTankName, setEditingTankName] = useState(false);
  const [tankNameValue, setTankNameValue] = useState('');
  // v10.0 P0-4: City selector
  const [editingCity, setEditingCity] = useState(false);
  const [cityValue, setCityValue] = useState('');

  const [heaterOn, setHeaterOn] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [heaterToggling, setHeaterToggling] = useState(false);

  // v9.1 REQ-3 / v10.1.2 Item 3: Nickname privacy — hidden by default, click to reveal, auto-hide after 2.5s
  const [visibleNicknameId, setVisibleNicknameId] = useState<string | null>(null);
  const nicknameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearNicknameTimer = useCallback(() => {
    if (nicknameTimerRef.current) { clearTimeout(nicknameTimerRef.current); nicknameTimerRef.current = null; }
  }, []);
  const revealNickname = useCallback((fishId: string) => {
    clearNicknameTimer();
    setVisibleNicknameId(fishId);
    nicknameTimerRef.current = setTimeout(() => setVisibleNicknameId(null), 2500);
  }, [clearNicknameTimer]);
  // Cleanup timer on unmount, and global click-to-hide
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-nickname]')) {
        clearNicknameTimer();
        setVisibleNicknameId(null);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => {
      clearNicknameTimer();
      document.removeEventListener('click', handleDocClick);
    };
  }, [clearNicknameTimer]);

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
      // v10.0 P0-4: Use tank's location (per-tank city), fallback to 'Beijing'
      const city = tank?.location || 'Beijing';
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
  }, [tankId, tank?.location]);

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

  // v9.1 REQ-7: Poll temperature adjust job every 30s
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const job = await api<{
          jobId: string; fromTemp: number; toTemp: number;
          currentTemp: number; status: string;
          remainingSeconds: number; deltaPerMinute: number;
        } | null>(`/api/fish-tanks/${tankId}/temperature-adjust`);
        if (cancelled) return;
        setTempJob(job && job.status === 'active' ? job : null);
      } catch {
        setTempJob(null);
      }
    };

    poll();
    timer = setInterval(poll, 30000);
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [tankId]);

  // v9.1 REQ-4: Handle rename
  const handleRename = async (fishId: string) => {
    if (!renameValue.trim() || renameValue.trim().length > 20) return;
    setBusy(true);
    try {
      await api(`/api/fish-tanks/${tankId}/fishes/${fishId}`, {
        method: 'PATCH',
        body: JSON.stringify({ nickname: renameValue.trim(), userId: USER_ID }),
      });
      setToast('重命名成功');
      setRenamingFishId(null);
      setRenameValue('');
      await load();
    } catch (e: any) {
      setToast('重命名失败: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // v10.0 P0-1: Save tank name
  const handleSaveTankName = async () => {
    const trimmed = tankNameValue.trim();
    if (!trimmed || trimmed.length > 20) {
      setToast('鱼缸名称需要 1-20 个字符');
      return;
    }
    setBusy(true);
    try {
      await api(`/api/fish-tanks/${tankId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: trimmed }),
      });
      setToast('鱼缸名称已更新');
      setEditingTankName(false);
      await load();
    } catch (e: any) {
      setToast('更新失败: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // v10.0 P0-4: Save tank city
  const handleSaveCity = async () => {
    const trimmed = cityValue.trim();
    if (!trimmed) {
      setToast('请输入城市名称');
      return;
    }
    setBusy(true);
    try {
      await api(`/api/fish-tanks/${tankId}`, {
        method: 'PATCH',
        body: JSON.stringify({ city: trimmed }),
      });
      setToast('城市已更新');
      setEditingCity(false);
      await load();
      loadWeather();
    } catch (e: any) {
      setToast('更新失败: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

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
        <div className="flex-1 min-w-0">
          <Link
            href="/tanks"
            className="text-[11px] font-light text-accent tracking-wide inline-block mb-2"
          >
            ← {tCommon('back')}
          </Link>
          {/* v10.0 P0-1: Tank name inline edit */}
          {editingTankName ? (
            <div className="flex items-center gap-1">
              <input
                className="text-2xl font-light text-text-primary bg-glass/50 border border-glass-border rounded px-2 py-0.5 w-full max-w-[300px]"
                value={tankNameValue}
                onChange={(e) => setTankNameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTankName(); if (e.key === 'Escape') setEditingTankName(false); }}
                autoFocus
                maxLength={20}
              />
              <button onClick={handleSaveTankName} className="text-sm text-accent px-1" disabled={busy}>✓</button>
              <button onClick={() => setEditingTankName(false)} className="text-sm text-text-secondary px-1">✕</button>
            </div>
          ) : (
            <h1 className="text-2xl font-light text-text-primary tracking-wide flex items-center gap-2">
              {tName(tank.name)}
              <button
                onClick={() => { setEditingTankName(true); setTankNameValue(tank.name); }}
                className="text-text-secondary hover:text-accent transition text-base opacity-50 hover:opacity-100"
                title="编辑鱼缸名称"
              >✎</button>
            </h1>
          )}
          {/* v10.0 P0-4: City display + edit */}
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-xs text-text-secondary font-light">
              {tkSize(tank.size, t)}
            </p>
            <span className="text-text-secondary/40">·</span>
            {editingCity ? (
              <div className="flex items-center gap-1">
                <input
                  className="text-xs text-text-primary bg-glass/50 border border-glass-border rounded px-1.5 py-0.5 w-24"
                  value={cityValue}
                  onChange={(e) => setCityValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCity(); if (e.key === 'Escape') setEditingCity(false); }}
                  placeholder="城市名"
                  autoFocus
                />
                <button onClick={handleSaveCity} className="text-[10px] text-accent px-0.5" disabled={busy}>✓</button>
                <button onClick={() => setEditingCity(false)} className="text-[10px] text-text-secondary px-0.5">✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingCity(true); setCityValue(tank.location || ''); }}
                className="text-xs text-text-secondary hover:text-accent transition font-light"
                title="切换城市"
              >
                🏙 {tank.location || '未设置'} ✎
              </button>
            )}
          </div>
        </div>
        {/* CapacityBar: shown in header on md+ (top horizontal) */}
        <div className="hidden md:block w-48">
          <div className="text-[9px] text-text-secondary uppercase tracking-wide mb-1">鱼缸容量</div>
          <CapacityBar size={tank!.size} current={fishCount} />
        </div>
      </header>

      {/* v9.1 REQ-7: Temperature adjust progress bar */}
      {tempJob && (
        <div className="shrink-0 px-1">
          <GlassCard className="py-2 px-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-primary font-light">水温调节中... 剩余 {Math.ceil(tempJob.remainingSeconds / 60)} 分钟</p>
              <span className="text-[10px] text-text-secondary">{tempJob.currentTemp.toFixed(1)}° → {tempJob.toTemp.toFixed(1)}°</span>
            </div>
            <ProgressBar
              value={tempJob.toTemp !== tempJob.fromTemp
                ? Math.min(100, Math.max(0, ((tempJob.currentTemp - tempJob.fromTemp) / (tempJob.toTemp - tempJob.fromTemp)) * 100))
                : 50}
              variant="accent"
            />
          </GlassCard>
        </div>
      )}

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
        <div className="grid grid-cols-3 gap-2">
          <Button variant="accent" onClick={feedAll} disabled={busy || !fishList.length}>
            <Icon name="feed" size={14} /> {t('feedAll')}
          </Button>
          <Button variant="primary" onClick={waterChange} disabled={busy}>
            <Icon name="water" size={14} /> 换水
          </Button>
          {/* v10.0 P0-1: Add fish entry point */}
          <Link href={`/species?tankId=${tankId}`}>
            <Button variant="accent" disabled={busy || fishCount >= capacity}>
              + 添加鱼
            </Button>
          </Link>
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
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {fishList.map((f) => {
                const variant = slugToVariant(f.species?.name ?? f.species?.id);
                const isRenaming = renamingFishId === f.id;
                // v9.1 REQ-7: Fish mood based on currentTemp vs optimalTempRange
                const currentTemp = tank!.temperature ?? tank!.temp;
                const optimalMin = f.species?.tempMin;
                const optimalMax = f.species?.tempMax;
                let moodEmoji = '😊';
                if (optimalMin != null && optimalMax != null) {
                  const diff = Math.min(Math.abs(currentTemp - optimalMin), Math.abs(currentTemp - optimalMax));
                  if (currentTemp < optimalMin || currentTemp > optimalMax) {
                    moodEmoji = diff > 5 ? '😵' : '😟';
                  }
                }
                return (
                  <div key={f.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-glass transition">
                    <Link href={`/growth/${f.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                      <FishAvatar variant={variant} stage={f.stage} size={40} animated={false} />
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              maxLength={20}
                              placeholder="新昵称"
                              className="w-24 px-1.5 py-0.5 rounded text-xs bg-glass border border-glass-border text-text-primary outline-none"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(f.id); if (e.key === 'Escape') setRenamingFishId(null); }}
                            />
                            <button onClick={() => handleRename(f.id)} className="text-xs text-accent hover:text-accent-aux px-1">✓</button>
                            <button onClick={() => setRenamingFishId(null)} className="text-xs text-text-secondary px-1">✕</button>
                          </div>
                        ) : (
                          <p
                            className="text-sm text-text-primary whitespace-normal break-words cursor-pointer"
                            data-nickname="true"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (f.name) revealNickname(f.id); }}
                          >
                            {f.name
                              ? (visibleNicknameId === f.id ? f.name : '•••••')
                              : tf(f.stage)
                            } <span className="text-xs">{moodEmoji}</span>
                          </p>
                        )}
                        <p className="text-[10px] font-light text-text-secondary">
                          {tf(f.stage)} · {Math.round(f.growth)}%
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRenamingFishId(f.id); setRenameValue(f.name || ''); }}
                      className="text-[9px] text-text-secondary hover:text-accent shrink-0 px-1.5 py-0.5 rounded border border-glass-border hover:border-accent/40 transition"
                    >
                      ✎ 重命名
                    </button>
                    <div className="flex gap-1 shrink-0">
                      <Tag variant="success">
                        <Icon name="health" size={11} /> {Math.round(f.health)}
                      </Tag>
                      <Tag variant="gold">
                        <Icon name="feed" size={11} /> {Math.round(f.nutrition)}
                      </Tag>
                    </div>
                  </div>
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
              const isRenaming = renamingFishId === f.id;
              // v9.1 REQ-7: Fish mood
              const currentTemp = tank!.temperature ?? tank!.temp;
              const optimalMin = f.species?.tempMin;
              const optimalMax = f.species?.tempMax;
              let moodEmoji = '😊';
              if (optimalMin != null && optimalMax != null) {
                const diff = Math.min(Math.abs(currentTemp - optimalMin), Math.abs(currentTemp - optimalMax));
                if (currentTemp < optimalMin || currentTemp > optimalMax) {
                  moodEmoji = diff > 5 ? '😵' : '😟';
                }
              }
              return (
                <div key={f.id} className="block p-2 rounded-xl hover:bg-glass transition">
                  <Link href={`/growth/${f.id}`} className="flex items-center gap-2 mb-1">
                    <FishAvatar variant={variant} stage={f.stage} size={32} animated={false} />
                    <div className="min-w-0">
                      {isRenaming ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            maxLength={20}
                            placeholder="新昵称"
                            className="w-24 px-1.5 py-0.5 rounded text-[10px] bg-glass border border-glass-border text-text-primary outline-none"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(f.id); if (e.key === 'Escape') setRenamingFishId(null); }}
                          />
                          <button onClick={() => handleRename(f.id)} className="text-[10px] text-accent px-1">✓</button>
                          <button onClick={() => setRenamingFishId(null)} className="text-[10px] text-text-secondary px-1">✕</button>
                        </div>
                      ) : (
                        <p
                          className="text-xs text-text-primary whitespace-normal break-words cursor-pointer"
                          data-nickname="true"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (f.name) revealNickname(f.id); }}
                        >
                          {f.name
                            ? (visibleNicknameId === f.id ? f.name : '•••••')
                            : tf(f.stage)
                          } <span>{moodEmoji}</span>
                        </p>
                      )}
                      <p className="text-[9px] text-text-secondary">{tf(f.stage)}</p>
                    </div>
                  </Link>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-text-secondary mb-1">
                    <span>健康: {Math.round(f.health)}%</span>
                    <span>营养: {Math.round(f.nutrition)}%</span>
                    <span>成长: {Math.round(f.growth)}%</span>
                    <span>养殖: {adoptedDays}天</span>
                  </div>
                  <button
                    onClick={() => { setRenamingFishId(f.id); setRenameValue(f.name || ''); }}
                    className="text-[9px] text-text-secondary hover:text-accent px-1.5 py-0.5 rounded border border-glass-border hover:border-accent/40 transition w-full"
                  >
                    ✎ 重命名
                  </button>
                </div>
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

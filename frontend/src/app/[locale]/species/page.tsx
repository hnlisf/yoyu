'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApi, api, FishSpecies } from '@/lib/api';
import { FishAvatar } from '@/components/fish/FishAvatar';
import { slugToVariant } from '@/components/fish/types';
import { TankSelector } from '@/components/Tank/TankSelector';

const STORAGE_KEY = 'fishgrow.tankId';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = 3,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        signal: AbortSignal.timeout?.(10000),
      });
      if (res.status === 404) return res;
      if (res.status >= 500 && i < retries - 1) {
        await sleep(1000 * Math.pow(2, i));
        continue;
      }
      return res;
    } catch (e: any) {
      if (i < retries - 1) {
        await sleep(1000 * Math.pow(2, i));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Max retries exceeded');
}

type ErrorCategory = 'not_found' | 'network' | 'server' | 'timeout';
function classifyError(e: any, status?: number): ErrorCategory {
  if (status === 404) return 'not_found';
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') return 'timeout';
  if (status && status >= 500) return 'server';
  return 'network';
}

// v9.1: Visual variant options
const VISUAL_COLORS = ['red', 'blue', 'golden'];
const VISUAL_PATTERNS = ['solid', 'spotted', 'striped'];
const VISUAL_BODY_TYPES = ['slim', 'round', 'elongated'];

export default function SpeciesPage() {
  const t = useTranslations('species');
  const tf = useTranslations('fish');
  const { data: species, loading, refetch } = useApi<FishSpecies[]>('/api/fish-species?lang=' + (typeof window !== 'undefined' ? (document.cookie.match(/locale=(\w+)/)?.[1] ?? 'zh') : 'zh'));
  const [adding, setAdding] = useState(false);
  const [addingStep, setAddingStep] = useState(1); // v9.1: wizard steps 1-3
  const [name, setName] = useState('');
  const [tempMin, setTempMin] = useState(20);
  const [tempMax, setTempMax] = useState(28);
  const [phMin, setPhMin] = useState(6.5);
  const [phMax, setPhMax] = useState(7.5);
  const [growthDays, setGrowthDays] = useState(60);
  const [feedFreq, setFeedFreq] = useState<'daily' | 'twice_daily' | 'every_2_days'>('twice_daily');
  const [color, setColor] = useState('#5BA9C7');
  const [visualVariant, setVisualVariant] = useState({ color: 'red', pattern: 'solid', body: 'slim' });
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // v9.1 REQ-2: Nickname modal FIRST, then tank selector
  const [showNicknameFirst, setShowNicknameFirst] = useState(false);
  const [nickname, setNickname] = useState('');
  const [showTankSelector, setShowTankSelector] = useState(false);
  const [pendingSpecies, setPendingSpecies] = useState<FishSpecies | null>(null);

  // v9.1 REQ-2: Start add-fish flow — show nickname modal FIRST
  const startAddToTank = (sp: FishSpecies) => {
    setPendingSpecies(sp);
    setNickname('');
    setShowNicknameFirst(true);
  };

  // Called when nickname is confirmed (required) — proceed to tank selector
  const onNicknameConfirmed = () => {
    setShowNicknameFirst(false);
    setShowTankSelector(true);
  };

  // Called when user picks a tank from TankSelector — finalize
  const onTankSelected = async (tankId: string) => {
    setShowTankSelector(false);
    localStorage.setItem(STORAGE_KEY, tankId);
    if (!pendingSpecies) return;

    setBusy(true);
    try {
      await api('/api/fish', {
        method: 'POST',
        body: JSON.stringify({
          tankId,
          speciesId: pendingSpecies.id,
          name: nickname.trim(),
        }),
      });
      setToastMsg(`已添加 ${pendingSpecies.name} (${nickname}) 到鱼缸！`);
    } catch (e: any) {
      setToastMsg(`添加失败：${e.message}`);
    } finally {
      setBusy(false);
      setPendingSpecies(null);
      setNickname('');
    }
  };

  // v10.0.1 hotfix: consume URL query params (from tank detail "Add Fish" link)
  // URL query takes priority over localStorage to prevent fish being added to wrong tank
  const searchParams = useSearchParams();
  const urlTankId = searchParams.get('tankId');
  const urlSelect = searchParams.get('select') === 'true';

  // v10.0.1 二修: prevent double-trigger of auto-select on re-renders
  const selectTriggered = useRef(false);

  // Sync localStorage + auto-open add-fish flow when URL provides tankId + ?select=true
  useEffect(() => {
    if (urlTankId && urlSelect && species && species.length > 0 && !selectTriggered.current) {
      selectTriggered.current = true;
      localStorage.setItem(STORAGE_KEY, urlTankId);
      console.debug('[species] tankId source: URL (auto-select)', urlTankId);
      // Trigger same flow as clicking "select" button on a species card
      startAddToTank(species[0]);
    }
  }, [urlTankId, urlSelect, species]);

  // Legacy direct add (for backward compatibility — skips TankSelector + nickname)
  const addToTank = async (sp: FishSpecies) => {
    setBusy(true);
    // v10.0.1 hotfix: URL query 优先 (来自鱼缸详情页 "Add Fish" 跳转)
    let tankId = urlTankId || localStorage.getItem(STORAGE_KEY);

    if (tankId) {
      try {
        const res = await fetchWithRetry(`/api/fish-tanks/${tankId}`);
        if (!res.ok) {
          const category = classifyError(null, res.status);
          if (category === 'not_found') {
            tankId = null;
            localStorage.removeItem(STORAGE_KEY);
          } else if (category === 'server') {
            setToastMsg('服务器暂时不可用，请稍后重试');
            setBusy(false);
            return;
          }
        }
      } catch (e: any) {
        const category = classifyError(e);
        if (category === 'network' || category === 'timeout') {
          setToastMsg('网络连接失败，请检查网络后重试');
          setBusy(false);
          return;
        }
        setToastMsg('操作失败，请重试');
        setBusy(false);
        return;
      }
    }

    if (!tankId) {
      try {
        // Try to reuse existing tank first (avoid DUPLICATE_TANK_NAME dead loop on 404 recovery)
        const existing = await api<{ id: string }[]>('/api/fish-tanks?userId=demo-user');
        if (existing && existing.length > 0) {
          tankId = existing[0].id;
          localStorage.setItem(STORAGE_KEY, tankId);
        } else {
          const res = await fetchWithRetry('/api/fish-tanks', {
            method: 'POST',
            body: JSON.stringify({ userId: 'demo-user', name: '我的鱼缸' }),
          });
          if (!res.ok) {
            setToastMsg('创建鱼缸失败，请重试');
            setBusy(false);
            return;
          }
          const tank = await res.json();
          tankId = tank.id as string;
          localStorage.setItem(STORAGE_KEY, tankId!);
        }
        // Set as default tank for HomeRedirect
        try {
          await api('/api/user/preferences', {
            method: 'PUT',
            body: JSON.stringify({ defaultTankId: tankId }),
          });
        } catch { /* non-critical */ }
      } catch (e: any) {
        setToastMsg('网络连接失败，请检查网络后重试');
        setBusy(false);
        return;
      }
    }

    try {
      await api('/api/fish', {
        method: 'POST',
        body: JSON.stringify({ tankId, speciesId: sp.id }),
      });
      setToastMsg(`已添加 ${sp.name} 到鱼缸！`);
    } catch (e: any) {
      setToastMsg(`添加失败：${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const createCustom = async () => {
    if (!name) return;
    if (!name.trim()) return;
    setBusy(true);
    try {
      const lang = document.cookie.match(/locale=(\w+)/)?.[1] ?? 'zh';
      const result = await api<{ id: string; name: string }>('/api/fish-species/custom', {
        method: 'POST',
        body: JSON.stringify({
          nameI18n: JSON.stringify({ zh: name, en: name, ja: name }),
          descI18n: JSON.stringify({ zh: '自定义鱼种', en: 'Custom species', ja: 'カスタム魚種' }),
          tempMin, tempMax, phMin, phMax, growthDays, feedFreq, color,
          visualVariant: JSON.stringify(visualVariant),
          stages: JSON.stringify([
            { name: 'fry', label: { zh: '鱼苗', en: 'Fry', ja: '稚魚' }, days: Math.round(growthDays * 0.1) },
            { name: 'juvenile', label: { zh: '幼鱼', en: 'Juvenile', ja: '幼魚' }, days: Math.round(growthDays * 0.4) },
            { name: 'subadult', label: { zh: '亚成鱼', en: 'Subadult', ja: '亜成魚' }, days: Math.round(growthDays * 0.75) },
            { name: 'adult', label: { zh: '成鱼', en: 'Adult', ja: '成魚' }, days: growthDays },
          ]),
        }),
      });
      setAdding(false);
      setName('');
      // v9.0 REQ-4: refetch immediately so custom species appears without reload
      refetch();
      setToastMsg(`自定义鱼种「${result.name ?? name}」创建成功！`);
    } catch (e: any) {
      setToastMsg('创建失败：' + (e.message ?? '未知错误'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      {/* Inline toast for feedback */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-water-700 text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs animate-fade-in">
          <span>{toastMsg}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="ml-3 text-white/70 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-water-600">{t('title')}</h1>
          <p className="text-water-500 text-sm mt-1">{t('subtitle')}</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-secondary text-sm">+ {t('addCustom')}</button>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {species?.map((sp) => {
          let visualVariantObj: { color?: string; pattern?: string; body?: string } | null = null;
          if (sp.variant && typeof sp.variant === 'string' && sp.variant.startsWith('{')) {
            try { visualVariantObj = JSON.parse(sp.variant); } catch {}
          }
          return (
          <div key={sp.id} className="card hover:shadow-md transition">
            <div className="h-20 rounded-2xl mb-3 bg-water-50 flex items-center justify-center">
              <FishAvatar variant={(sp.variant as any) ?? slugToVariant(sp.name)} size={64} animated={false} />
            </div>
            <h3 className="font-semibold text-water-600 text-lg">{sp.name}</h3>
            <p className="text-sm text-water-500 mt-1 line-clamp-2">{sp.description}</p>
            {visualVariantObj && (
              <div className="flex gap-1 mt-1.5 text-[10px] text-water-400">
                <span className="bg-water-50 px-1.5 py-0.5 rounded">{visualVariantObj.color}</span>
                <span className="bg-water-50 px-1.5 py-0.5 rounded">{visualVariantObj.pattern}</span>
                <span className="bg-water-50 px-1.5 py-0.5 rounded">{visualVariantObj.body}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="rounded-lg bg-water-50 p-2">
                <p className="text-water-500">🌡️ {t('tempRange')}</p>
                <p className="font-medium text-water-700">{sp.tempMin}-{sp.tempMax}°C</p>
              </div>
              <div className="rounded-lg bg-water-50 p-2">
                <p className="text-water-500">⚗️ {t('phRange')}</p>
                <p className="font-medium text-water-700">{sp.phMin}-{sp.phMax}</p>
              </div>
              <div className="rounded-lg bg-water-50 p-2">
                <p className="text-water-500">📅 {t('growthDays')}</p>
                <p className="font-medium text-water-700">{sp.growthDays} {tf('days')}</p>
              </div>
              <div className="rounded-lg bg-water-50 p-2">
                <p className="text-water-500">🍤 {t('feedFreq')}</p>
                <p className="font-medium text-water-700">
                  {sp.feedFreq === 'daily' ? t('freqDaily') : sp.feedFreq === 'twice_daily' ? t('freqTwice') : t('freq2Days')}
                </p>
              </div>
            </div>
            <button onClick={() => startAddToTank(sp)} className="btn-primary w-full mt-4 text-sm">
              {t('selectButton')}
            </button>
          </div>
          );
        })}
      </div>

      {/* v9.1 REQ-2: Nickname modal FIRST (required, 1-20 chars) */}
      <TankSelector
        isOpen={showTankSelector}
        onClose={() => { setShowTankSelector(false); setPendingSpecies(null); setNickname(''); }}
        onSelect={onTankSelected}
      />

      {/* v9.1 REQ-2: Nickname modal — required, shows BEFORE tank selector */}
      {showNicknameFirst && pendingSpecies && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNicknameFirst(false)}>
          <div className="bg-card max-w-sm w-full rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-light text-text-primary">给鱼取个名字</h2>
            <p className="text-xs text-text-secondary">
              即将添加 <span className="text-accent">{pendingSpecies.name}</span>，请为它取个名字
            </p>
            <input
              type="text"
              placeholder="输入昵称（1-20个字符）"
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-glass border border-glass-border text-text-primary placeholder:text-text-secondary/50 text-sm outline-none focus:border-accent transition"
              autoFocus
            />
            <p className="text-[10px] text-text-secondary text-right">{nickname.length}/20</p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowNicknameFirst(false)} className="flex-1 py-2 rounded-xl border border-glass-border text-text-secondary text-sm hover:bg-glass transition">
                取消
              </button>
              <button
                onClick={onNicknameConfirmed}
                disabled={nickname.trim().length < 1}
                className="flex-1 py-2 rounded-xl bg-accent text-deep text-sm font-medium hover:bg-accent-aux transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                下一步
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v9.1 Custom species wizard with 3 steps */}
      {adding && (
        <div className="fixed inset-0 bg-water-600/30 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-semibold text-water-600">{t('addCustom')}</h2>
              <span className="text-xs text-water-400 ml-auto">步骤 {addingStep}/3</span>
            </div>

            {addingStep === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="label">{t('customName')}</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">🌡️ Temp min</label>
                    <input className="input" type="number" value={tempMin} onChange={(e) => setTempMin(+e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Temp max</label>
                    <input className="input" type="number" value={tempMax} onChange={(e) => setTempMax(+e.target.value)} />
                  </div>
                  <div>
                    <label className="label">⚗️ pH min</label>
                    <input className="input" type="number" step="0.1" value={phMin} onChange={(e) => setPhMin(+e.target.value)} />
                  </div>
                  <div>
                    <label className="label">pH max</label>
                    <input className="input" type="number" step="0.1" value={phMax} onChange={(e) => setPhMax(+e.target.value)} />
                  </div>
                  <div>
                    <label className="label">📅 {t('growthDays')}</label>
                    <input className="input" type="number" value={growthDays} onChange={(e) => setGrowthDays(+e.target.value)} />
                  </div>
                  <div>
                    <label className="label">🎨 Color</label>
                    <input className="input h-10 p-1" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">{t('feedFreq')}</label>
                  <select className="input" value={feedFreq} onChange={(e) => setFeedFreq(e.target.value as any)}>
                    <option value="daily">{t('freqDaily')}</option>
                    <option value="twice_daily">{t('freqTwice')}</option>
                    <option value="every_2_days">{t('freq2Days')}</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setAdding(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={() => setAddingStep(2)} disabled={!name.trim()} className="btn-primary flex-1">下一步</button>
                </div>
              </div>
            )}

            {addingStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-water-500">选择外观特征（{VISUAL_COLORS.length} × {VISUAL_PATTERNS.length} × {VISUAL_BODY_TYPES.length} = 27 种组合）</p>
                <div>
                  <label className="label">颜色 Color</label>
                  <select className="input" value={visualVariant.color} onChange={(e) => setVisualVariant({ ...visualVariant, color: e.target.value })}>
                    {VISUAL_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">花纹 Pattern</label>
                  <select className="input" value={visualVariant.pattern} onChange={(e) => setVisualVariant({ ...visualVariant, pattern: e.target.value })}>
                    {VISUAL_PATTERNS.map((p) => <option key={p} value={p}>{p === 'solid' ? '纯色 Solid' : p === 'spotted' ? '斑点 Spotted' : '条纹 Striped'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">体型 Body</label>
                  <select className="input" value={visualVariant.body} onChange={(e) => setVisualVariant({ ...visualVariant, body: e.target.value })}>
                    {VISUAL_BODY_TYPES.map((b) => <option key={b} value={b}>{b === 'slim' ? '细长 Slim' : b === 'round' ? '圆形 Round' : '延长 Elongated'}</option>)}
                  </select>
                </div>
                <div className="bg-water-50 rounded-lg p-3 text-xs text-water-500">
                  当前: {visualVariant.color} · {visualVariant.pattern} · {visualVariant.body}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setAddingStep(1)} className="btn-secondary flex-1">上一步</button>
                  <button onClick={createCustom} disabled={busy} className="btn-primary flex-1">{busy ? '…' : '创建'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

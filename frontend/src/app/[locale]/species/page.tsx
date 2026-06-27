'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useApi, api, FishSpecies } from '@/lib/api';
import { FishAvatar } from '@/components/fish/FishAvatar';
import { slugToVariant } from '@/components/fish/types';

const STORAGE_KEY = 'fishgrow.tankId';

/** Sleep helper for exponential backoff */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch with exponential backoff retry (max 3 attempts).
 * 404 errors are NOT retried — they propagate immediately.
 * Network errors and 5xx are retried with 1s/2s/4s backoff.
 */
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
        // Abort after 10s per attempt
        signal: AbortSignal.timeout?.(10000),
      });
      // 404: don't retry
      if (res.status === 404) return res;
      // 5xx: retry
      if (res.status >= 500 && i < retries - 1) {
        await sleep(1000 * Math.pow(2, i));
        continue;
      }
      return res;
    } catch (e: any) {
      // Network error / timeout: retry
      if (i < retries - 1) {
        await sleep(1000 * Math.pow(2, i));
        continue;
      }
      throw e; // exhausted retries
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Classify fetch errors into 4 categories for tankId handling.
 */
type ErrorCategory = 'not_found' | 'network' | 'server' | 'timeout';
function classifyError(e: any, status?: number): ErrorCategory {
  if (status === 404) return 'not_found';
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') return 'timeout';
  if (status && status >= 500) return 'server';
  // Network errors: TypeError, Failed to fetch, etc.
  return 'network';
}

export default function SpeciesPage() {
  const t = useTranslations('species');
  const tf = useTranslations('fish');
  const { data: species, loading, refetch } = useApi<FishSpecies[]>('/api/fish-species?lang=' + (typeof window !== 'undefined' ? (document.cookie.match(/locale=(\w+)/)?.[1] ?? 'zh') : 'zh'));
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [tempMin, setTempMin] = useState(20);
  const [tempMax, setTempMax] = useState(28);
  const [phMin, setPhMin] = useState(6.5);
  const [phMax, setPhMax] = useState(7.5);
  const [growthDays, setGrowthDays] = useState(60);
  const [feedFreq, setFeedFreq] = useState<'daily' | 'twice_daily' | 'every_2_days'>('twice_daily');
  const [color, setColor] = useState('#5BA9C7');
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const addToTank = async (sp: FishSpecies) => {
    setBusy(true);
    let tankId = localStorage.getItem(STORAGE_KEY);

    // Validate existing tankId with proper error classification
    if (tankId) {
      try {
        const res = await fetchWithRetry(`/api/fish-tanks/${tankId}`);
        if (!res.ok) {
          const category = classifyError(null, res.status);
          if (category === 'not_found') {
            // 404: tank was deleted — clear stale id, will recreate below
            tankId = null;
            localStorage.removeItem(STORAGE_KEY);
          } else if (category === 'server') {
            // 5xx: keep tankId, show error, don't create new tank
            setToastMsg('服务器暂时不可用，请稍后重试');
            setBusy(false);
            return;
          }
        }
      } catch (e: any) {
        const category = classifyError(e);
        if (category === 'network' || category === 'timeout') {
          // Network error: keep tankId, retry exhausted, show message
          setToastMsg('网络连接失败，请检查网络后重试');
          setBusy(false);
          return;
        }
        // Unknown error: keep tankId, show message
        setToastMsg('操作失败，请重试');
        setBusy(false);
        return;
      }
    }

    // Create tank if needed (only when 404 cleared the id or no id yet)
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
          tankId = tank.id;
          localStorage.setItem(STORAGE_KEY, tankId);
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

    // Add fish to tank
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
      refetch();
      alert(`自定义鱼种「${result.name ?? name}」创建成功！`);
    } catch (e: any) {
      alert('创建失败：' + (e.message ?? '未知错误'));
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {species?.map((sp) => (
          <div key={sp.id} className="card hover:shadow-md transition">
            <div className="h-20 rounded-2xl mb-3 bg-water-50 flex items-center justify-center">
              <FishAvatar variant={(sp.variant as any) ?? slugToVariant(sp.name)} size={64} animated={false} />
            </div>
            <h3 className="font-semibold text-water-600 text-lg">{sp.name}</h3>
            <p className="text-sm text-water-500 mt-1 line-clamp-2">{sp.description}</p>
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
            <button onClick={() => addToTank(sp)} className="btn-primary w-full mt-4 text-sm">
              {t('selectButton')}
            </button>
          </div>
        ))}
      </div>

      {adding && (
        <div className="fixed inset-0 bg-water-600/30 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-water-600 mb-4">{t('addCustom')}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">{t('customName')}</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
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
                <button onClick={createCustom} disabled={busy} className="btn-primary flex-1">{busy ? '…' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

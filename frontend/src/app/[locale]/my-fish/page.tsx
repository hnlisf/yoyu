'use client';

import { useMemo, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api, Fish } from '@/lib/api';
import { FishAvatar } from '@/components/fish';
import { slugToVariant } from '@/components/fish/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/routing';

const USER_ID = 'demo-user';
const PAGE_LIMIT = 20;

// v9.0 REQ-5: Status display config
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  healthy: { label: '健康', color: 'bg-green-500/20 text-green-400' },
  subhealthy: { label: '亚健康', color: 'bg-yellow-500/20 text-yellow-400' },
  danger: { label: '危险', color: 'bg-red-500/20 text-red-400' },
  hungry: { label: '饥饿', color: 'bg-orange-500/20 text-orange-400' },
  dead: { label: '已死', color: 'bg-gray-500/20 text-gray-400' },
};

interface MyFishItem {
  fishId: string;
  fishName: string;
  nickname: string;
  tankId: string;
  tankName: string;
  daysInTank: number;
  status: string;
}

/**
 * v9.1 My Fish List Page — paginated list from /api/user/me/fishes
 * Shows fishName, nickname, tankName, daysInTank, status
 * Also keeps "收藏鱼种" (collected species) section at the bottom.
 */
export default function MyFishPage() {
  const t = useTranslations('fish');
  const tProfile = useTranslations('profile');
  const [fishItems, setFishItems] = useState<MyFishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Also load legacy fish list for collected species display
  const [legacyFish, setLegacyFish] = useState<Fish[]>([]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api<{ total: number; page: number; items: MyFishItem[] }>(
          `/api/user/me/fishes?userId=${USER_ID}&page=${page}&limit=${PAGE_LIMIT}`
        );
        if (!cancelled) {
          setFishItems(data.items || []);
          setTotal(data.total || 0);
        }
      } catch {
        // tolerate — fallback to legacy endpoint
        try {
          const data = await api<Fish[]>(`/api/fish/my?userId=${USER_ID}`);
          if (!cancelled) {
            setFishItems(data.map((f) => ({
              fishId: f.id,
              fishName: f.species?.name ?? '',
              nickname: f.name || '',
              tankId: f.tankId,
              tankName: '',
              daysInTank: f.adoptedDays ?? 0,
              status: f.status ?? 'healthy',
            })));
            setTotal(data.length);
          }
        } catch {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page]);

  // Load legacy fish for "collected species" section
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<Fish[]>(`/api/fish/my?userId=${USER_ID}`);
        if (!cancelled) setLegacyFish(data);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Unique species from legacy fish
  const uniqueSpecies = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; id: string }[] = [];
    for (const f of legacyFish) {
      const spName = f.species?.name;
      if (spName && !seen.has(spName)) {
        seen.add(spName);
        result.push({ name: spName, id: f.species!.id });
      }
    }
    return result;
  }, [legacyFish]);

  if (loading && fishItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-secondary text-sm font-light">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* v9.1: "我养的鱼" section at top */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-light text-text-primary tracking-wide">
            我养的鱼
          </h1>
          <span className="text-sm text-text-secondary font-light">共 {total} 条</span>
        </div>

        {fishItems.length === 0 ? (
          <GlassCard>
            <p className="text-text-secondary text-sm font-light text-center py-8">
              还没有鱼，去鱼缸添加吧~
            </p>
          </GlassCard>
        ) : (
          <>
            {/* Desktop: table view */}
            <div className="hidden sm:block">
              <GlassCard className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-glass-border text-text-secondary text-xs font-light uppercase tracking-wide">
                      <th className="text-left py-2 px-3">鱼种</th>
                      <th className="text-left py-2 px-3">昵称</th>
                      <th className="text-left py-2 px-3">鱼缸</th>
                      <th className="text-center py-2 px-3">养殖天数</th>
                      <th className="text-center py-2 px-3">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fishItems.map((f) => {
                      const status = f.status ?? 'healthy';
                      const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.healthy;
                      return (
                        <tr key={f.fishId} className="border-b border-glass-border/30 hover:bg-glass/50 transition">
                          <td className="py-2 px-3 text-text-primary text-xs">{f.fishName || '——'}</td>
                          <td className="py-2 px-3 text-text-primary text-xs truncate max-w-[120px]">{f.nickname || '——'}</td>
                          <td className="py-2 px-3 text-text-secondary text-xs">{f.tankName || '——'}</td>
                          <td className="py-2 px-3 text-center text-text-secondary tabular-nums text-xs">{f.daysInTank} 天</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </GlassCard>
            </div>

            {/* Mobile: card view */}
            <div className="sm:hidden space-y-2">
              {fishItems.map((f) => {
                const status = f.status ?? 'healthy';
                const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.healthy;
                return (
                  <GlassCard key={f.fishId} hover className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {f.fishName || '——'}
                      </p>
                      <p className="text-[10px] text-text-secondary font-light">
                        昵称: {f.nickname || '——'} · {f.tankName || '——'} · {f.daysInTank} 天
                      </p>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </GlassCard>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  ← 上一页
                </Button>
                <span className="text-xs text-text-secondary">
                  {page} / {totalPages}
                </span>
                <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  下一页 →
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* v9.1: "收藏鱼种" moved to bottom */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-light text-text-primary tracking-wide">
            {tProfile('favorites')}
          </h2>
          <span className="text-xs text-text-secondary font-light">{uniqueSpecies.length} 种</span>
        </div>

        {uniqueSpecies.length === 0 ? (
          <GlassCard>
            <p className="text-text-secondary text-sm font-light text-center py-6">
              还没有收藏鱼种
            </p>
          </GlassCard>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {uniqueSpecies.map((sp) => (
              <Tag key={sp.id} variant="neutral" className="cursor-default">
                {sp.name}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

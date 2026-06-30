'use client';

import { useMemo, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api, Fish } from '@/lib/api';
import { FishAvatar } from '@/components/fish';
import { slugToVariant } from '@/components/fish/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tag } from '@/components/ui/Tag';
import { Link } from '@/i18n/routing';

const USER_ID = 'demo-user';

// v9.0 REQ-5: Status display config
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  healthy: { label: '健康', color: 'bg-green-500/20 text-green-400' },
  subhealthy: { label: '亚健康', color: 'bg-yellow-500/20 text-yellow-400' },
  danger: { label: '危险', color: 'bg-red-500/20 text-red-400' },
  hungry: { label: '饥饿', color: 'bg-orange-500/20 text-orange-400' },
  dead: { label: '已死', color: 'bg-gray-500/20 text-gray-400' },
};

/**
 * v9.0 My Fish List Page — lists all user's fish across all tanks.
 * Shows species, nickname, adopted days, and health status.
 * Supports filtering by tank. Responsive: table on desktop, cards on mobile.
 */
export default function MyFishPage() {
  const t = useTranslations('fish');
  const tProfile = useTranslations('profile');
  const [fishList, setFishList] = useState<Fish[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTank, setFilterTank] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<Fish[]>(`/api/fish/my?userId=${USER_ID}`);
        if (!cancelled) setFishList(data);
      } catch {
        // tolerate
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const tankIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const f of fishList) {
      if (!seen.has(f.tankId)) {
        seen.add(f.tankId);
        ids.push(f.tankId);
      }
    }
    return ids;
  }, [fishList]);

  const filtered = useMemo(() => {
    if (filterTank === 'all') return fishList;
    return fishList.filter((f) => f.tankId === filterTank);
  }, [fishList, filterTank]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-secondary text-sm font-light">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-light text-text-primary tracking-wide">
          {tProfile('myFish')}
        </h1>
        <span className="text-sm text-text-secondary font-light">{filtered.length} 条鱼</span>
      </div>

      {/* Tank filter */}
      {tankIds.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <Tag
            variant={filterTank === 'all' ? 'primary' : 'neutral'}
            className="cursor-pointer"
            onClick={() => setFilterTank('all')}
          >
            全部
          </Tag>
          {tankIds.map((tid) => (
            <Tag
              key={tid}
              variant={filterTank === tid ? 'primary' : 'neutral'}
              className="cursor-pointer"
              onClick={() => setFilterTank(tid)}
            >
              鱼缸 {tid.slice(0, 6)}
            </Tag>
          ))}
        </div>
      )}

      {/* Fish list */}
      {filtered.length === 0 ? (
        <GlassCard>
          <p className="text-text-secondary text-sm font-light text-center py-8">
            还没有鱼，去鱼缸添加吧~
          </p>
        </GlassCard>
      ) : (
        <>
          {/* Desktop: table view (hidden on mobile) */}
          <div className="hidden sm:block">
            <GlassCard className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border text-text-secondary text-xs font-light uppercase tracking-wide">
                    <th className="text-left py-2 px-3">鱼</th>
                    <th className="text-left py-2 px-3">鱼种</th>
                    <th className="text-center py-2 px-3">养殖天数</th>
                    <th className="text-center py-2 px-3">状态</th>
                    <th className="text-center py-2 px-3">饱食度</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => {
                    const variant = slugToVariant(f.species?.name ?? f.species?.id);
                    const adoptedDays = f.adoptedDays ?? Math.floor((Date.now() - new Date(f.birthday).getTime()) / 86400000);
                    const status = f.status ?? 'healthy';
                    const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.healthy;
                    return (
                      <tr key={f.id} className="border-b border-glass-border/30 hover:bg-glass/50 transition">
                        <td className="py-2 px-3">
                          <Link href={`/growth/${f.id}`} className="flex items-center gap-2">
                            <FishAvatar variant={variant} stage={f.stage} size={36} animated={false} />
                            <span className="text-text-primary truncate max-w-[120px]">
                              {f.name || f.stage}
                            </span>
                          </Link>
                        </td>
                        <td className="py-2 px-3 text-text-secondary text-xs">
                          {f.species?.name ?? '——'}
                        </td>
                        <td className="py-2 px-3 text-center text-text-secondary tabular-nums text-xs">
                          {adoptedDays} 天
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums text-xs">
                          <Tag variant="gold">{Math.round(f.nutrition)}</Tag>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </GlassCard>
          </div>

          {/* Mobile: card view (hidden on desktop) */}
          <div className="sm:hidden space-y-2">
            {filtered.map((f) => {
              const variant = slugToVariant(f.species?.name ?? f.species?.id);
              const adoptedDays = f.adoptedDays ?? Math.floor((Date.now() - new Date(f.birthday).getTime()) / 86400000);
              const status = f.status ?? 'healthy';
              const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.healthy;
              return (
                <Link key={f.id} href={`/growth/${f.id}`}>
                  <GlassCard hover className="flex items-center gap-3 p-3">
                    <FishAvatar variant={variant} stage={f.stage} size={48} animated={false} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {f.name || f.stage}
                      </p>
                      <p className="text-[10px] text-text-secondary font-light">
                        {f.species?.name ?? '——'} · 养了 {adoptedDays} 天
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        缸 {f.tankId.slice(0, 6)}
                      </span>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

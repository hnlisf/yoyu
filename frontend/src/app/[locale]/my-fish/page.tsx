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

/**
 * v6.0 My Fish List Page — lists all user's fish across all tanks.
 * Supports filtering by tank.
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

  // Unique tank IDs for filter
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
      <h1 className="text-xl font-light text-text-primary tracking-wide">
        {tProfile('myFish')}
      </h1>

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
        <div className="space-y-2">
          {filtered.map((f) => {
            const variant = slugToVariant(f.species?.name ?? f.species?.id);
            return (
              <Link key={f.id} href={`/growth/${f.id}`}>
                <GlassCard hover className="flex items-center gap-3 p-3">
                  <FishAvatar
                    variant={variant}
                    stage={f.stage}
                    size={48}
                    animated={false}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {f.name || f.stage}
                    </p>
                    <p className="text-[10px] text-text-secondary font-light">
                      {f.species?.name ?? '——'} · {t('stage.' + f.stage)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Tag variant="gold">
                      饱食 {Math.round(f.nutrition)}
                    </Tag>
                    <span className="text-[10px] text-text-secondary">
                      缸 {f.tankId.slice(0, 6)}
                    </span>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

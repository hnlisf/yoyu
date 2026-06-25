'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { api, FishTank } from '@/lib/api';

/**
 * v7.0 HomeRedirect — 3-branch routing (UI-3)
 *
 * On mount:
 *   1. Fetch all tanks for the user
 *   2.  0 tanks → /tanks (empty state with create guide)
 *   3.  1 tank  → /tanks/:id (direct to the only tank)
 *   4.  N tanks → /tanks/:defaultTankId (or first tank as fallback)
 */
export function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const userId = searchParams.get('userId') ||
      (typeof window !== 'undefined' ? localStorage.getItem('userId') : null) ||
      'demo-user';

    (async () => {
      try {
        const tanks = await api<FishTank[]>(
          `/api/fish-tanks?userId=${encodeURIComponent(userId)}`,
        );

        if (cancelled) return;

        if (tanks.length === 0) {
          // No tanks — show empty state
          router.replace('/tanks');
        } else if (tanks.length === 1) {
          // Exactly one tank — go straight to it
          router.replace(`/tanks/${tanks[0].id}`);
        } else {
          // Multiple tanks — resolve defaultTankId
          try {
            const me = await api<{ defaultTankId?: string }>(
              `/api/user/me/default-tank?userId=${encodeURIComponent(userId)}`,
            );
            const targetId = me?.defaultTankId ?? tanks[0].id;
            router.replace(`/tanks/${targetId}`);
          } catch {
            // Fallback to first tank
            router.replace(`/tanks/${tanks[0].id}`);
          }
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setTimeout(() => router.replace('/tanks'), 500);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-secondary text-sm font-light">
          正在跳转到鱼缸列表...
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm font-light">加载中...</p>
      </div>
    </div>
  );
}

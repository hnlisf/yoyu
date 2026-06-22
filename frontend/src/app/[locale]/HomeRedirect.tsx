'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';

const USER_ID = 'demo-user';

/**
 * v6.0 HomeRedirect — on mount, queries user's default tank
 * and redirects accordingly.
 *
 * - If defaultTankId → redirect to /tanks/:id
 * - If no defaultTankId → redirect to /tanks
 */
export function HomeRedirect() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await api<{ defaultTankId?: string }>(
          `/api/user/me/default-tank?userId=${USER_ID}`,
        );

        if (cancelled) return;

        if (data?.defaultTankId) {
          router.replace(`/tanks/${data.defaultTankId}`);
        } else {
          router.replace('/tanks');
        }
      } catch {
        if (!cancelled) {
          // API not available — redirect to tanks list
          setError(true);
          setTimeout(() => router.replace('/tanks'), 500);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [router]);

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

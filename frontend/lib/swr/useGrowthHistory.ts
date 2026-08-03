/**
 * ============================================================================
 * 文件名：swr/useGrowthHistory.ts（成长历史 SWR Hook）
 * ============================================================================
 * 作用：替代 growth/[fishId]/page.tsx 的 mockGrowthHistory 调用
 *
 * P4 §3.3.1：PR 21 — 用 SWR 包真实后端 API
 *
 * SWR 收益：
 *   - 自动 revalidate（focus / reconnect）
 *   - 错误重试
 *   - 共享缓存（多组件同 fetch 不重复请求）
 *
 * 设计取舍：
 *   - 一个数据 shape 一个 hook —— 命名 `useGrowthHistory` 与后端对齐
 *   - 参数化 fishId + limit —— 调用方只传业务参数
 *   - revalidateOnFocus: true 对齐当前 useEffect 行为
 * ============================================================================
 */

'use client';

import useSWR from 'swr';

export interface GrowthPoint {
  at: string;
  growth: number;
  stage: 'fry' | 'juvenile' | 'subadult' | 'adult';
  weight: number | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * useGrowthHistory —— 取一条鱼的成长时间序列
 *
 * @param fishId 鱼只 ID（null 时不请求）
 * @param limit   最多返回几个点（默认 30）
 */
export function useGrowthHistory(fishId: string | null, limit: number = 30) {
  const { data, error, isLoading, mutate } = useSWR<GrowthPoint[]>(
    fishId ? `/api/fish/${fishId}/growth-history?limit=${limit}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5_000,
    },
  );

  return {
    points: data ?? [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}
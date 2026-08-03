'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useApi, api, Reminder } from '@/lib/api';
// P4 PR 22：改用 src/lib/i18n/parseLocalized.ts 单一来源（消除内联 try/parse/fallback）
import { parseLocalized } from '@/lib/i18n/parseLocalized';

function getTitle(rem: Reminder, locale: string): string {
  // P4 PR 22：用 parseLocalized 替代内联 JSON.parse + 三元 fallback
  return parseLocalized(rem.titleI18n, locale, 'Reminder');
}

export default function RemindersPage() {
  const t = useTranslations('reminders');
  const tCommon = useTranslations('common');
  const locale = typeof window !== 'undefined' ? (document.cookie.match(/locale=(\w+)/)?.[1] ?? 'zh') : 'zh';
  const { data, refetch, loading } = useApi<Reminder[]>('/api/reminders?userId=demo-user');
  const [busy, setBusy] = useState(false);

  const ensure = async () => {
    setBusy(true);
    try {
      await api('/api/reminders/ensure-defaults', {
        method: 'POST',
        body: JSON.stringify({ userId: 'demo-user' }),
      });
      refetch();
    } finally { setBusy(false); }
  };

  const markDone = async (id: string) => {
    await api(`/api/reminders/${id}`, { method: 'PUT', body: JSON.stringify({ isDone: true }) });
    refetch();
  };
  const remove = async (id: string) => {
    await api(`/api/reminders/${id}`, { method: 'DELETE' });
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-water-600">{t('title')}</h1>
        <button onClick={ensure} disabled={busy} className="btn-secondary text-sm">
          {t('createAll')}
        </button>
      </div>

      {loading ? <p>{tCommon('loading')}</p> : data && data.length === 0 ? (
        <div className="card text-center py-12 text-water-500">
          <div className="text-5xl mb-3">🔔</div>
          <p>{t('empty')}</p>
          <button onClick={ensure} className="btn-primary mt-4 text-sm">{t('createAll')}</button>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.map((r) => {
            const typeLabel = r.type === 'feed' ? '🍤' : r.type === 'water_change' ? '💧' : '🧽';
            const due = new Date(r.dueAt);
            const isOverdue = !r.isDone && due.getTime() < Date.now();
            return (
              <div key={r.id} className={`card flex items-center gap-3 ${r.isDone ? 'opacity-50' : ''}`}>
                <div className="text-2xl">{typeLabel}</div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-water-600 ${r.isDone ? 'line-through' : ''}`}>
                    {getTitle(r, locale)}
                  </p>
                  <p className={`text-xs ${isOverdue ? 'text-coral-500 font-medium' : 'text-water-500'}`}>
                    {t('dueAt')}: {due.toLocaleString(locale)}
                    {isOverdue && ' (overdue)'}
                  </p>
                </div>
                {!r.isDone && (
                  <button onClick={() => markDone(r.id)} className="btn-secondary text-xs">
                    {t('markDone')}
                  </button>
                )}
                <button onClick={() => remove(r.id)} className="text-water-400 hover:text-coral-500 text-sm">🗑</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

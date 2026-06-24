'use client';

import { useTranslations } from 'next-intl';

export type AchievementKey =
  | 'firstTank'
  | 'fishWhisperer'
  | 'masterFeeder'
  | 'consistentCarer'
  | 'tankBreeder'
  | 'aquaExpert'
  | 'fishFriend'
  | 'dedication';

interface AchievementBadgeProps {
  achievementKey: AchievementKey;
  unlocked?: boolean;
  unlockedAt?: string;
}

/**
 * AchievementBadge — renders an achievement by key with its Chinese name
 * from i18n messages. The i18n mapping lives under `achievements.*` in zh.json
 * (and en.json / ja.json).
 */
export function AchievementBadge({ achievementKey, unlocked = false, unlockedAt }: AchievementBadgeProps) {
  const t = useTranslations('achievements');

  const name = t(achievementKey);
  const description = t(`${achievementKey}Description`);

  return (
    <div
      className={`flex flex-col items-center text-center p-3 rounded-xl border transition shrink-0 w-24 ${
        unlocked
          ? 'bg-glass border-glass-border'
          : 'bg-glass/30 border-glass-border opacity-50'
      }`}
      title={description || name}
    >
      <span className={`mb-1.5 text-2xl ${unlocked ? 'text-accent' : 'text-text-secondary'}`} aria-hidden>
        {achievementIcons[achievementKey] || '🏆'}
      </span>
      <p className="text-[11px] font-normal text-text-primary leading-tight whitespace-nowrap">
        {name}
      </p>
      {unlocked && unlockedAt && (
        <p className="text-[9px] text-text-secondary mt-1">{unlockedAt}</p>
      )}
    </div>
  );
}

/** Quick emoji icon mapping per achievement key (keeps the component self-contained). */
const achievementIcons: Record<AchievementKey, string> = {
  firstTank: '🫙',
  fishWhisperer: '🐟',
  masterFeeder: '🍖',
  consistentCarer: '⏰',
  tankBreeder: '🐣',
  aquaExpert: '💧',
  fishFriend: '🤝',
  dedication: '🔥',
};

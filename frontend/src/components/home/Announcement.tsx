'use client';

import { useState } from 'react';

/**
 * Announcement — collapsible announcement banner
 * Client component (needs useState for dismiss)
 */
export default function Announcement() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mx-4 mt-4 p-3 rounded-xl bg-accent/10 border border-accent/20 flex items-center gap-3 animate-float">
      <span className="text-lg flex-shrink-0">📢</span>
      <p className="text-text-primary text-sm flex-1 min-w-0">
        YoYu 正式上线！从鱼苗到成鱼，一起见证成长。
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 w-7 h-7 rounded-full bg-glass border border-glass-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
        aria-label="关闭公告"
      >
        ✕
      </button>
    </div>
  );
}

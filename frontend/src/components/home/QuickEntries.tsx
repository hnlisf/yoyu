import Link from 'next/link';

const ENTRIES = [
  { href: '/tanks', icon: '🫙', label: '新建鱼缸', sub: '开始养鱼' },
  { href: '/stats', icon: '🏆', label: '排行榜', sub: '看看谁最强' },
  { href: '/species', icon: '📖', label: '鱼种图鉴', sub: '了解每种鱼' },
  { href: '/profile', icon: 'ℹ️', label: '关于', sub: '版本与反馈' },
];

/**
 * QuickEntries — 4 quick navigation entries
 * Server component
 */
export default function QuickEntries() {
  return (
    <section className="px-4 py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ENTRIES.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-glass-border hover:border-accent/40 hover:bg-card/80 transition-all text-center"
          >
            <span className="text-2xl">{entry.icon}</span>
            <span className="text-text-primary text-sm font-medium">
              {entry.label}
            </span>
            <span className="text-text-secondary text-xs">{entry.sub}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

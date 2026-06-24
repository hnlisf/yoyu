import Link from 'next/link';

// Hardcoded recommended species for MVP — matches existing species in the app
const RECOMMENDED_FISH = [
  { id: 'goldfish', nameKey: '金鱼', emoji: '🐠', desc: '好养入门' },
  { id: 'guppy', nameKey: '孔雀鱼', emoji: '🐟', desc: '色彩缤纷' },
  { id: 'koi', nameKey: '锦鲤', emoji: '🐡', desc: '花纹优雅' },
];

/**
 * RecommendedFish — recommended species cards
 * Server component (static for MVP, can be SSR later)
 */
export default function RecommendedFish() {
  return (
    <section className="px-4 py-6">
      <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-4">
        推荐鱼种
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {RECOMMENDED_FISH.map((fish) => (
          <Link
            key={fish.id}
            href={`/species`}
            className="group flex items-center gap-4 p-4 rounded-xl bg-card border border-glass-border hover:border-accent/40 transition-all"
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              {fish.emoji}
            </div>
            <div className="min-w-0">
              <p className="text-text-primary font-medium truncate">
                {fish.nameKey}
              </p>
              <p className="text-text-secondary text-sm">{fish.desc}</p>
            </div>
            <span className="ml-auto text-text-secondary text-lg group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

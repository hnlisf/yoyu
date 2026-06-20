import HomeHero from '@/components/home/HomeHero';
import RecommendedFish from '@/components/home/RecommendedFish';
import QuickEntries from '@/components/home/QuickEntries';
import Announcement from '@/components/home/Announcement';

/**
 * Home page — brand hero + recommended fish + quick entries + announcement
 * Architecture v3: component tree replacing old redirect pattern
 */
export default function HomePage() {
  return (
    <div className="space-y-2">
      <Announcement />
      <HomeHero />
      <RecommendedFish />
      <QuickEntries />
    </div>
  );
}

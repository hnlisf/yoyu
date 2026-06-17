'use client';
// TEMP: per-fish individual showcase (for Ada's tests)
import { FISH_VARIANTS, FishAvatar } from '@/components/fish';

export default function FishOnly() {
  return (
    <div className="min-h-screen bg-deep-sea p-6">
      <h1 className="text-xl font-light text-text-primary mb-6">Individual Fish Showcase</h1>
      <div className="space-y-6">
        {FISH_VARIANTS.map((v) => (
          <div key={v} className="glass-card p-4 flex flex-col items-center">
            <div style={{ width: 240, height: 144 }}>
              <FishAvatar variant={v} size={240} animated={false} />
            </div>
            <p className="text-text-primary mt-2 capitalize">{v}</p>
            <p className="text-text-secondary text-xs">240px size, static</p>
          </div>
        ))}
      </div>
    </div>
  );
}

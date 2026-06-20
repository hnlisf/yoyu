/**
 * 8 predefined Bézier curve paths for fish swimming in the tank.
 * Paths cover horizontal, vertical, diagonal, and wave patterns
 * across the tank area (approx 600×280 viewport).
 *
 * Format: SVG path `d` string compatible with CSS offset-path: path('...')
 */
export interface SwimPath {
  id: number;
  /** SVG path `d` string */
  d: string;
  /** Human-readable label */
  label: string;
  /** Typical animation duration range in seconds */
  durationMin: number;
  durationMax: number;
}

export const SWIM_PATHS: SwimPath[] = [
  {
    id: 1,
    d: 'M 0,140 Q 150,60 300,140 T 600,140',
    label: '横向中段巡航',
    durationMin: 10,
    durationMax: 15,
  },
  {
    id: 2,
    d: 'M 0,70 Q 200,-30 400,70 T 800,70',
    label: '上层大波浪',
    durationMin: 8,
    durationMax: 14,
  },
  {
    id: 3,
    d: 'M 0,210 Q 150,260 300,210 T 600,210',
    label: '纵向摆动',
    durationMin: 12,
    durationMax: 18,
  },
  {
    id: 4,
    d: 'M 0,40 Q 250,100 500,40 T 1000,40',
    label: '长距离巡航',
    durationMin: 14,
    durationMax: 22,
  },
  {
    id: 5,
    d: 'M 50,0 Q 0,140 50,280 T 50,560',
    label: '纵向左侧巡游',
    durationMin: 12,
    durationMax: 20,
  },
  {
    id: 6,
    d: 'M 150,0 Q 100,140 150,280 T 150,560',
    label: '纵向右侧巡游',
    durationMin: 12,
    durationMax: 20,
  },
  {
    id: 7,
    d: 'M 0,240 Q 300,180 600,240 T 1200,240',
    label: '底部巡航',
    durationMin: 10,
    durationMax: 16,
  },
  {
    id: 8,
    d: 'M 0,20 Q 180,60 360,20 T 720,20',
    label: '顶层浅水巡游',
    durationMin: 9,
    durationMax: 14,
  },
];

/**
 * Pick a random swim path for a fish, optionally avoiding the last path.
 */
export function pickRandomPath(avoidId?: number): SwimPath {
  const pool = avoidId
    ? SWIM_PATHS.filter((p) => p.id !== avoidId)
    : SWIM_PATHS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get a random duration within the path's range.
 */
export function randomDuration(path: SwimPath): number {
  return (
    path.durationMin +
    Math.random() * (path.durationMax - path.durationMin)
  );
}

/**
 * Determine if a fish should use full swim animation based on fish count.
 * Perf degradation tiers:
 *   ≤ 20: all fish swim
 *   21-50: only 50% swim, rest float
 *   > 50: all float only
 */
export function shouldSwim(index: number, totalFish: number): boolean {
  if (totalFish <= 20) return true;
  if (totalFish <= 50) return index % 2 === 0;
  return false;
}

/**
 * Variant identifiers shared across all 10 fish species.
 * Maps to the SVG components under ./components/fish/.
 */
export type FishVariant =
  | 'goldfish'
  | 'koi'
  | 'guppy'
  | 'tropical'
  | 'tetra'
  | 'cory'
  | 'pleco'
  | 'otocinclus'
  | 'angelfish'
  | 'betta';

/** Growth stages used to scale the avatar size. */
export type FishStage = 'fry' | 'juvenile' | 'subadult' | 'adult';

export const FISH_VARIANTS: FishVariant[] = [
  'goldfish', 'koi', 'guppy', 'tropical', 'tetra',
  'cory', 'pleco', 'otocinclus', 'angelfish', 'betta',
];

/**
 * Species → variant mapping.
 *
 * The backend's fish_species table uses UUIDs as `id` and stores the user-facing
 * name in the `name` field. We match either by a known english slug *or* by
 * the Chinese/Japanese name (substring match is enough for the seed data).
 */
const SPECIES_NAME_TO_VARIANT: Array<{ match: RegExp | string; variant: FishVariant }> = [
  // English slugs
  { match: /^goldfish$/i, variant: 'goldfish' },
  { match: /^guppy$/i, variant: 'guppy' },
  { match: /^tetra$/i, variant: 'tetra' },
  { match: /^neon.?tetra$/i, variant: 'tetra' },
  { match: /^koi|carp$/i, variant: 'koi' },
  { match: /^angel|angelfish$/i, variant: 'angelfish' },
  { match: /^tropical$/i, variant: 'tropical' },
  { match: /^betta$/i, variant: 'betta' },
  { match: /^cory|corydoras$/i, variant: 'cory' },
  { match: /^pleco|plecostomus$/i, variant: 'pleco' },
  { match: /^oto|otocinclus$/i, variant: 'otocinclus' },
  { match: /^molly$/i, variant: 'guppy' },
  { match: /^neon$/i, variant: 'tetra' },
  { match: /^platy$/i, variant: 'tetra' },
  { match: /^gourami$/i, variant: 'tropical' },
  // Chinese names (zh) — substring match
  { match: /金鱼|金鲫|草金/, variant: 'goldfish' },
  { match: /锦鲤|红鲤/, variant: 'koi' },
  { match: /孔雀/, variant: 'guppy' },
  { match: /灯科|灯鱼|霓虹|小型鱼|青鳉/, variant: 'tetra' },
  { match: /神仙鱼/, variant: 'angelfish' },
  { match: /热带鱼/, variant: 'tropical' },
  { match: /斗鱼/, variant: 'betta' },
  { match: /鼠鱼/, variant: 'cory' },
  { match: /异形/, variant: 'pleco' },
  { match: /清道夫/, variant: 'otocinclus' },
  { match: /七彩/, variant: 'tropical' },
];

export function slugToVariant(slug?: string | null): FishVariant {
  if (!slug) return 'guppy';
  const key = slug.toLowerCase();
  for (const { match, variant } of SPECIES_NAME_TO_VARIANT) {
    if (typeof match === 'string') {
      if (key === match.toLowerCase() || key.includes(match.toLowerCase())) {
        return variant;
      }
    } else if (match.test(key)) {
      return variant;
    }
  }
  return 'guppy';
}

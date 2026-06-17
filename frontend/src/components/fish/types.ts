/**
 * Variant identifiers shared across the 5 fish species.
 * Maps to the SVG components under ./components/fish/.
 */
export type FishVariant = 'goldfish' | 'guppy' | 'tetra' | 'betta' | 'angel';

/** Growth stages used to scale the avatar size. */
export type FishStage = 'fry' | 'juvenile' | 'subadult' | 'adult';

export const FISH_VARIANTS: FishVariant[] = ['goldfish', 'guppy', 'tetra', 'betta', 'angel'];

/**
 * Species → v4 variant mapping.
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
  { match: /^betta$/i, variant: 'betta' },
  { match: /^angel|angelfish$/i, variant: 'angel' },
  { match: /^koi|carp$/i, variant: 'goldfish' },
  { match: /^molly$/i, variant: 'guppy' },
  { match: /^neon$/i, variant: 'tetra' },
  { match: /^platy$/i, variant: 'tetra' },
  // Chinese names (zh) — substring match
  { match: /金鱼|锦鲤/, variant: 'goldfish' },
  { match: /孔雀/, variant: 'guppy' },
  { match: /灯科|灯鱼|霓虹|热带鱼/, variant: 'tetra' },
  { match: /斗鱼/, variant: 'betta' },
  { match: /神仙鱼/, variant: 'angel' },
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

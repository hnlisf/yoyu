/**
 * Variant identifiers shared across the 5 fish species.
 * Maps to the SVG components under ./components/fish/.
 */
export type FishVariant = 'goldfish' | 'guppy' | 'tetra' | 'betta' | 'angel';

/** Growth stages used to scale the avatar size. */
export type FishStage = 'fry' | 'juvenile' | 'subadult' | 'adult';

export const FISH_VARIANTS: FishVariant[] = ['goldfish', 'guppy', 'tetra', 'betta', 'angel'];

export const FISH_VARIANT_TO_SLUG: Record<string, string> = {
  // Common species slugs from the backend seed → v4 variant.
  // Falls back to 'guppy' for unknown slugs (multi-fish tank default).
  goldfish: 'goldfish',
  guppy: 'guppy',
  molly: 'guppy',
  tetra: 'tetra',
  neon: 'tetra',
  betta: 'betta',
  angel: 'angel',
  angelfish: 'angel',
  koi: 'goldfish',
  carp: 'goldfish',
  platy: 'tetra',
};

export function slugToVariant(slug?: string | null): FishVariant {
  if (!slug) return 'guppy';
  const key = slug.toLowerCase();
  return (FISH_VARIANT_TO_SLUG[key] as FishVariant) ?? 'guppy';
}

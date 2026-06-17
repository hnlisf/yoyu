'use client';

import { SVGProps } from 'react';

export type IconName =
  | 'feed' // fish food pellet
  | 'water' // water drop
  | 'treat' // medical cross / pill
  | 'health' // heart
  | 'fish' // single fish
  | 'fishCount' // fish + count
  | 'bubble' // bubble cluster
  | 'growth' // upward chart
  | 'mood' // smile
  | 'trophy' // achievement
  | 'add' // plus
  | 'back' // arrow
  | 'edit' // pencil
  | 'close' // x
  | 'check'; // checkmark

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

/**
 * v4 icon set — all stroked (1.6–1.8 stroke-width), no fill, currentColor.
 * Replaces emoji previously used in the core pages.
 */
export function Icon({ name, size = 16, className = '', ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className,
    ...rest,
  };

  switch (name) {
    case 'feed':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <circle cx="6" cy="6" r="1.4" />
          <circle cx="18" cy="6" r="1.4" />
          <circle cx="6" cy="18" r="1.4" />
          <circle cx="18" cy="18" r="1.4" />
          <circle cx="3" cy="12" r="1" />
          <circle cx="21" cy="12" r="1" />
        </svg>
      );
    case 'water':
      return (
        <svg {...common}>
          <path d="M12 3 C 8 9 5 12 5 15.5 A 7 7 0 0 0 19 15.5 C 19 12 16 9 12 3 Z" />
        </svg>
      );
    case 'treat':
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="18" rx="1.5" />
          <path d="M9 10 H 15" />
          <path d="M9 14 H 15" />
        </svg>
      );
    case 'health':
      return (
        <svg {...common}>
          <path d="M12 20 S 4 14 4 9 A 4.5 4.5 0 0 1 12 7 A 4.5 4.5 0 0 1 20 9 C 20 14 12 20 12 20 Z" />
        </svg>
      );
    case 'fish':
      return (
        <svg {...common}>
          <path d="M2 12 c 2 -3 5 -5 8 -5 s 6 2 8 5 c -2 3 -5 5 -8 5 s -6 -2 -8 -5 z" />
          <circle cx="14" cy="11" r="0.9" fill="currentColor" stroke="none" />
          <path d="M22 12 l -2 -2 M 22 12 l -2 2" />
        </svg>
      );
    case 'fishCount':
      return (
        <svg {...common}>
          <path d="M2 12 c 1.5 -2 4 -4 7 -4 s 5.5 2 7 4 c -1.5 2 -4 4 -7 4 s -5.5 -2 -7 -4 z" />
          <path d="M19 12 l -2 -1.5 M 19 12 l -2 1.5" />
        </svg>
      );
    case 'bubble':
      return (
        <svg {...common}>
          <circle cx="8" cy="14" r="2.5" />
          <circle cx="14" cy="10" r="2" />
          <circle cx="17" cy="15" r="1.4" />
          <circle cx="10" cy="7" r="1.2" />
        </svg>
      );
    case 'growth':
      return (
        <svg {...common}>
          <path d="M3 17 L 9 11 L 13 15 L 21 7" />
          <path d="M15 7 H 21 V 13" />
        </svg>
      );
    case 'mood':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M9 14 c 1 1.4 2 2 3 2 s 2 -0.6 3 -2" />
          <circle cx="9" cy="10" r="0.6" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M8 4 H 16 V 9 A 4 4 0 0 1 8 9 V 4 Z" />
          <path d="M5 5 H 8 V 8 A 2.5 2.5 0 0 1 5.5 10.5" />
          <path d="M19 5 H 16 V 8 A 2.5 2.5 0 0 0 18.5 10.5" />
          <path d="M10 13 H 14 V 17 H 10 Z" />
          <path d="M8 20 H 16" />
          <path d="M12 17 V 20" />
        </svg>
      );
    case 'add':
      return (
        <svg {...common}>
          <path d="M12 5 V 19" />
          <path d="M5 12 H 19" />
        </svg>
      );
    case 'back':
      return (
        <svg {...common}>
          <path d="M15 5 L 8 12 L 15 19" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path d="M4 20 L 8 19 L 19 8 L 16 5 L 5 16 Z" />
          <path d="M14 7 L 17 10" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6 L 18 18" />
          <path d="M18 6 L 6 18" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="M5 12 L 10 17 L 19 7" />
        </svg>
      );
    default:
      return null;
  }
}

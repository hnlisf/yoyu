interface IconProps {
  size?: number;
  className?: string;
}

const stroke = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

export const TankIcon = ({ size = 22, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <rect x="4" y="6" width="16" height="14" rx="2" />
    <path d="M4 12c2-2 4-2 6 0s4 2 6 0" />
    <circle cx="10" cy="15" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export const SpeciesIcon = ({ size = 22, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M2 12c2-3 5-5 8-5s6 2 8 5c-2 3-5 5-8 5s-6-2-8-5z" />
    <circle cx="14" cy="11" r="0.6" fill="currentColor" stroke="none" />
    <path d="M22 12l-2-2M22 12l-2 2" />
  </svg>
);

export const GrowthIcon = ({ size = 22, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M3 17l5-5 4 4 8-8" />
    <path d="M14 8h6v6" />
  </svg>
);

export const StatsIcon = ({ size = 22, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <rect x="4" y="13" width="3" height="7" rx="0.5" />
    <rect x="10" y="9" width="3" height="11" rx="0.5" />
    <rect x="16" y="5" width="3" height="15" rx="0.5" />
  </svg>
);

export const ProfileIcon = ({ size = 22, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <circle cx="12" cy="9" r="3.5" />
    <path d="M5 20c1-3 4-5 7-5s6 2 7 5" />
  </svg>
);

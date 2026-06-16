'use client';

interface ProgressBarProps {
  value: number; // 0-100
  variant?: 'accent' | 'health' | 'orange' | 'gold';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const variantClass = {
  accent: 'progress-fill-accent',
  health: 'progress-fill-health',
  orange: 'progress-fill-orange',
  gold: 'progress-fill-gold',
};

export function ProgressBar({
  value,
  variant = 'accent',
  showLabel = false,
  label,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-[11px] font-light text-text-secondary mb-1.5">
          <span>{label}</span>
          <span className="text-text-primary tabular-nums">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="progress-track">
        <div
          className={`progress-fill ${variantClass[variant]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

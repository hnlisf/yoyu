'use client';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  ariaLabel?: string;
}

export function Switch({ checked, onChange, label, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      onClick={() => onChange(!checked)}
      className={`switch-track${checked ? ' on' : ''}`}
    >
      <span className="switch-thumb" />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

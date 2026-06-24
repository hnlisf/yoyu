'use client';

interface HeaterSwitchProps {
  tankId: string;
  heaterOn: boolean;
  onToggle: (tankId: string, newState: boolean) => void;
  disabled?: boolean;
}

/**
 * HeaterSwitch — toggle button for the tank heater.
 * Shows ON/OFF state with a visual indicator.
 * POSTs to /api/tank/:id/heater via the parent's onToggle callback.
 */
export function HeaterSwitch({ tankId, heaterOn, onToggle, disabled = false }: HeaterSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={heaterOn}
      aria-label={heaterOn ? 'Heater ON' : 'Heater OFF'}
      disabled={disabled}
      onClick={() => onToggle(tankId, !heaterOn)}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-light transition-all duration-200 ${
        heaterOn
          ? 'bg-accent/20 text-accent border border-accent/40 shadow-glow-accent'
          : 'bg-glass text-text-secondary border border-glass-border'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
    >
      {/* Indicator dot */}
      <span
        className={`w-2 h-2 rounded-full transition-colors ${
          heaterOn ? 'bg-accent shadow-[0_0_6px_var(--accent)]' : 'bg-text-secondary'
        }`}
      />
      {heaterOn ? 'ON' : 'OFF'}
    </button>
  );
}

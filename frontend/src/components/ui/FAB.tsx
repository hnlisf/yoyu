'use client';

import { ButtonHTMLAttributes } from 'react';

interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label?: string;
}

/**
 * Floating action button — bottom-right gradient button.
 */
export function FAB({ icon, label, className = '', ...rest }: FABProps) {
  return (
    <button
      type="button"
      aria-label={label ?? 'add'}
      className={`fab ${className}`}
      {...rest}
    >
      {icon ?? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </button>
  );
}

'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...rest }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[11px] font-light text-text-secondary mb-1.5 tracking-wide uppercase">
            {label}
          </label>
        )}
        <input ref={ref} className={`input ${className}`} {...rest} />
        {error && <p className="text-xs text-accent-orange mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

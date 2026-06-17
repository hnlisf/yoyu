'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ hover = false, className = '', children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={`glass-card${hover ? ' glass-card-hover' : ''} ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

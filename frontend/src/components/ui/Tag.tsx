'use client';

import { HTMLAttributes } from 'react';

export type TagVariant = 'primary' | 'success' | 'warning' | 'orange' | 'gold' | 'neutral';

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
}

const variantClass: Record<TagVariant, string> = {
  primary: 'tag-primary',
  success: 'tag-success',
  warning: 'tag-warning',
  orange: 'tag-orange',
  gold: 'tag-gold',
  neutral: 'tag-neutral',
};

export function Tag({ variant = 'primary', className = '', children, ...rest }: TagProps) {
  return (
    <span className={`tag ${variantClass[variant]} ${className}`} {...rest}>
      {children}
    </span>
  );
}

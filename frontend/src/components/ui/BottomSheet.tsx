'use client';

import { useEffect, ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Glass-morphism bottom sheet. Slides up from the bottom.
 * Clicking the backdrop closes it.
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="glass-backdrop" onClick={onClose} />
      <div className="bottom-sheet" role="dialog" aria-modal="true">
        <div className="bottom-sheet-handle" />
        {title && (
          <h3 className="text-sm font-normal text-text-primary mb-3">{title}</h3>
        )}
        {children}
      </div>
    </>
  );
}

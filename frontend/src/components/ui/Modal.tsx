'use client';

import { ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Centered glass modal. Clicking backdrop closes.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
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
      <div
        className="fixed inset-0 flex items-center justify-center z-50 px-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="glass-modal">
          {title && <h3 className="text-text-primary font-light mb-2">{title}</h3>}
          {children}
        </div>
      </div>
    </>
  );
}

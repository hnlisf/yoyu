'use client';

import { ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Centered glass modal. Clicking backdrop closes.
 */
export function Modal({ open, onClose, children }: ModalProps) {
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
        <div className="glass-modal">{children}</div>
      </div>
    </>
  );
}

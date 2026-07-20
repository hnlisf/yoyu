'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string | null;
  duration?: number;
  onDismiss?: () => void;
  /** @deprecated alias for onDismiss */
  onClose?: () => void;
  /** v10.1.3-w1: toast color type — warning (yellow), error (red), or undefined (default blue) */
  type?: 'success' | 'warning' | 'error';
}

export function Toast({ message, duration = 2400, onDismiss, onClose, type }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const dismiss = onDismiss ?? onClose;

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      dismiss?.();
    }, duration);
    return () => clearTimeout(t);
  }, [message, duration, dismiss]);

  if (!visible || !message) return null;

  const typeClass = type === 'warning' ? 'toast-warning' : type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : '';

  return (
    <div className={`toast ${typeClass}`.trim()} role="status" aria-live="polite">
      {message}
    </div>
  );
}

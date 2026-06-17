'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string | null;
  duration?: number;
  onDismiss?: () => void;
  /** @deprecated alias for onDismiss */
  onClose?: () => void;
}

export function Toast({ message, duration = 2400, onDismiss, onClose }: ToastProps) {
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
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

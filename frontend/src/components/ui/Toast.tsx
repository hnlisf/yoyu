'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string | null;
  duration?: number;
  onDismiss: () => void;
}

export function Toast({ message, duration = 2400, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, duration);
    return () => clearTimeout(t);
  }, [message, duration, onDismiss]);

  if (!visible || !message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

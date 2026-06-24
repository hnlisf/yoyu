'use client';

interface MoodWarningIconProps {
  mood: number;
}

/**
 * MoodWarningIcon — shows a red warning icon when fish mood drops below 30.
 * Displays ⚠️ + "状态不佳" (poor condition) text.
 */
export function MoodWarningIcon({ mood }: MoodWarningIconProps) {
  if (mood >= 30) return null;

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-light text-red-400 animate-pulse"
      title="Mood critically low"
    >
      <span aria-hidden>⚠️</span>
      <span>状态不佳</span>
    </span>
  );
}

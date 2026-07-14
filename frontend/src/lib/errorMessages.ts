/**
 * v10.1.3-w1: error_code → 中文映射，供换水/坦克操作 toast 使用。
 * 
 * Usage:
 *   import { getTankErrorMessage, getErrorSeverity } from '@/lib/errorMessages';
 *   const msg = getTankErrorMessage('tank_already_fresh', { remainingHours: 24, cooldownHours: 24 });
 *   const severity = getErrorSeverity('tank_already_fresh'); // 'warning'
 */

export function getTankErrorMessage(
  errorCode: string,
  data?: { remainingHours?: number; cooldownHours?: number },
): string {
  const remaining = data?.remainingHours ?? data?.cooldownHours ?? 24;

  switch (errorCode) {
    case 'tank_already_fresh':
      return `此缸上次换水才${remaining}小时，建议再等${remaining}小时再换。请耐心等等，小鱼不喜欢频繁换水 🐟`;
    case 'not_enough_water':
      return '水量不足，无法换水';
    case 'tank_not_found':
      return '鱼缸不存在，可能已被删除';
    case 'permission_denied':
      return '您没有操作此鱼缸的权限';
    default:
      return '操作失败，请稍后再试';
  }
}

export type ErrorSeverity = 'warning' | 'error';

/**
 * Returns the toast color severity for a given error_code.
 * cooldown / permission → yellow warning; everything else → red error.
 */
export function getErrorSeverity(errorCode: string): ErrorSeverity {
  switch (errorCode) {
    case 'tank_already_fresh':
    case 'permission_denied':
      return 'warning';
    default:
      return 'error';
  }
}

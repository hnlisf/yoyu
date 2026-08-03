/**
 * ============================================================================
 * 文件名：public.decorator.ts（@Public 标记装饰器）
 * ============================================================================
 * 作用：标记 Controller 方法或类为 "公开"，跳过 JWT 鉴权
 *
 * 用法：
 *   1. 标记整个 Controller（所有方法都公开）：
 *      @Public()
 *      @Controller('api/health')
 *      export class HealthController { ... }
 *
 *   2. 标记单个方法（更精确）：
 *      @Public()
 *      @Get('public-stats')
 *      async publicStats() { ... }
 *
 * 默认行为：所有路由都要 JWT 鉴权（除非标了 @Public()）
 *
 * 为什么默认鉴权而非默认公开？
 *   - 安全失败默认 = "拒绝"（fail-closed）
 *   - 漏标 @Public() → 用户访问受限（fail-safe）
 *   - 漏标 @UseGuards()（反过来）→ 任何人可访问（fail-open，危险）
 *
 * 实现原理：
 *   使用 Reflector（NestJS 内置）存 metadata
 *   JwtAuthGuard 在 canActivate 中用 reflector.get() 检查
 * ============================================================================
 */

import { SetMetadata } from '@nestjs/common';

/** metadata key — 用于 Reflector.get() 查询 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() 装饰器
 *
 * 标记目标（方法或类）为公开路由 — JwtAuthGuard 将跳过 JWT 验证
 *
 * @example
 * ```ts
 * @Public()
 * @Get('health')
 * health() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

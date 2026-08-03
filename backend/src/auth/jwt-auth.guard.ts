/**
 * ============================================================================
 * 文件名：jwt-auth.guard.ts（JWT 鉴权 Guard）
 * ============================================================================
 * 作用：全局鉴权 — 拦截所有 HTTP 请求，强制 JWT 验证（除非标记 @Public()）
 *
 * 注册方式（在 auth.module.ts）：
 *   {
 *     provide: APP_GUARD,
 *     useClass: JwtAuthGuard,
 *   }
 *
 * 工作流程（canActivate）：
 *   1. 用 Reflector 检查方法或类是否标 @Public()
 *      · 标了 → 直接 return true（跳过）
 *   2. 委托给 super.canActivate()（passport-jwt 自动）
 *      · 解析 Authorization 头
 *      · 验签 + 检查过期
 *      · 调用 JwtStrategy.validate() 注入 req.user
 *   3. 未通过 → 抛 UnauthorizedException（401）
 *
 * 关键决策：默认拒绝（fail-closed）
 *   - 漏标 @Public() = 路由受限（开发时立即发现）
 *   - 漏标 @UseGuards()（反过来）= 任何人可访问（攻击面扩大）
 *
 * 测试：
 *   写接口无 token → 401
 *   写接口有 token → 验证 + 注入 user
 *   标 @Public() 的路由 → 无 token 也通过
 * ============================================================================
 */

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * 是否放行的核心判断
   *
   * @param context NestJS 执行上下文
   * @returns true = 放行；false = 拒绝（401）
   */
  canActivate(context: ExecutionContext) {
    // 1) 检查是否标记 @Public()
    //    getAllAndOverride 同时检查 handler（方法）和 class（Controller）
    //    任何一个标了 @Public() 即视为公开
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),   // 方法级 metadata
      context.getClass(),     // 类级 metadata
    ]);

    if (isPublic) {
      return true;  // 公开路由：直接放行
    }

    // 2) 非公开路由：委托给 passport-jwt 自动处理
    //    super.canActivate() 内部会：
    //      - 解析 Bearer token
    //      - 用 JwtStrategy 验签
    //      - 注入 req.user
    //    任何错误抛 UnauthorizedException → NestJS 自动转 401
    return super.canActivate(context);
  }
}

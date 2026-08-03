/**
 * ============================================================================
 * 文件名：current-user.decorator.ts（@CurrentUser 参数装饰器）
 * ============================================================================
 * 作用：从 req.user（JWT 解码后由 Passport 注入）取当前登录用户
 *
 * 用法：
 *   1. 取整个 payload：
 *      @CurrentUser() user: { id: string; iat: number; exp: number }
 *
 *   2. 取特定字段：
 *      @CurrentUser('id') userId: string
 *
 * 典型场景（写接口拿到 userId）：
 *   @UseGuards(JwtAuthGuard)
 *   @Post()
 *   async create(
 *     @CurrentUser('id') userId: string,
 *     @Body() body: CreateDto,
 *   ) {
 *     return this.service.create({ ...body, userId });
 *   }
 *
 * 原理：
 *   NestJS 参数装饰器 = 接受一个函数 (data, ctx) => value
 *   - data 是装饰器参数（如 'id'）
 *   - ctx 是 ExecutionContext，通过 switchToHttp().getRequest() 拿 req
 *   - req.user 由 JwtStrategy.validate() 返回的对象（passport-jwt 自动注入）
 *
 * 配合 JwtStrategy.validate() — 见 jwt.strategy.ts
 * ============================================================================
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser 参数装饰器
 *
 * @param data 可选字段名 — 传入时取该字段（'id' / 'sub' 等）
 *             不传时返回整个 user 对象
 * @returns user 字段值
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 防御：如果上游未挂 JwtAuthGuard，user 可能为 undefined
    if (!user) return null;

    // 传 'id' / 'sub' / 'role' 等字段名时取该字段
    return data ? user[data] : user;
  },
);

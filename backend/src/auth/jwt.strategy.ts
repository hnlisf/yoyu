/**
 * ============================================================================
 * 文件名：jwt.strategy.ts（Passport JWT 策略）
 * ============================================================================
 * 作用：定义 "如何从 Bearer Token 提取用户" 的策略
 *
 * 工作流程：
 *   1. JwtAuthGuard 自动用 passport.authenticate('jwt') 调用此策略
 *   2. strategy 从 Authorization: Bearer <token> 提取 JWT
 *   3. 用 JWT_SECRET 验签 + 检查过期
 *   4. validate() 返回的对象被 passport 挂到 req.user
 *   5. Controller 用 @CurrentUser() 装饰器取出来
 *
 * token payload 约定（最小信息）：
 *   {
 *     sub: 'demo-user',     // = userId（JWT 标准字段）
 *     iat: 1700000000,      // issued at
 *     exp: 1700086400       // expires at
 *   }
 *
 * 为什么不放敏感信息到 JWT？
 *   - JWT 是 base64 编码（不加密），任何人都能解开看
 *   - 只放 userId 即可，需要详细信息时通过 userId 查 DB
 * ============================================================================
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JwtStrategy — Passport JWT strategy
 *
 * 被 JwtAuthGuard 隐式触发
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    // 从 ConfigService 取 JWT_SECRET（来自 .env）
    // 不用 process.env 直接读是因为 universal_baseline → env_schema_validation 强制
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET 未配置！请在 backend/.env 中设置（参考 backend/.env.example）',
      );
    }

    super({
      // 从 Authorization: Bearer <token> 提取 token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 不忽略过期 — 过期 token 必须 401
      ignoreExpiration: false,
      // 签名密钥（HS256 默认）
      secretOrKey: secret,
    });
  }

  /**
   * Passport 验签通过后调用此方法
   * 返回值会被 passport 挂到 req.user
   *
   * @param payload JWT 解码后的 payload（{ sub, iat, exp, ... }）
   * @returns req.user 的内容 — 这里是 { id: sub }，方便 @CurrentUser('id') 取
   */
  validate(payload: { sub: string; iat?: number; exp?: number }): { id: string } {
    // 标准化：把 JWT 标准的 'sub' 映射成业务字段 'id'
    // 这样 Controller 写 @CurrentUser('id') 而不是 @CurrentUser('sub')
    if (!payload.sub) {
      throw new Error('JWT payload 缺少 sub 字段');
    }
    return { id: payload.sub };
  }
}

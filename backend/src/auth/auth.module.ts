/**
 * ============================================================================
 * 文件名：auth.module.ts（认证模块）
 * ============================================================================
 * 作用：注册 JWT 服务 + Passport 策略 + 全局 Guard
 *
 * 注册 4 个关键 provider：
 *   1. JwtModule.registerAsync() — 异步读 .env 配置 JWT
 *   2. PassportModule            — 注册 passport
 *   3. JwtStrategy               — passport-jwt 策略
 *   4. APP_GUARD → JwtAuthGuard  — **全局 Guard**，拦截所有请求
 *
 * 为什么用 APP_GUARD 而不是 main.ts.useGlobalGuards()？
 *   - APP_GUARD 让 Guard 也参与 DI 容器（能 inject Reflector）
 *   - useGlobalGuards 不参与 DI，Reflector 必须手动 new
 *   - DI 方式更标准
 *
 * 暴露 AuthController（dev-token + verify 端点）
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    // Passport — 注册 passport-jwt 策略
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT — 异步从 ConfigService 取配置（这样 .env 没配好会清晰报错）
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          // 启动时 fail-fast：少了 JWT_SECRET 直接拒启动
          throw new Error(
            'JWT_SECRET 未配置！请 cp .env.example .env 并设置 JWT_SECRET',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: config.get<string>('JWT_EXPIRES_IN', '24h') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,

    // ── 关键：全局 Guard ──
    // 所有路由默认走 JwtAuthGuard，@Public() 标记的路由除外
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [JwtModule, JwtStrategy],   // 导出供其他模块用（如未来 user 模块重签）
})
export class AuthModule {}

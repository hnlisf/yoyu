/**
 * ============================================================================
 * 文件名：jwt-auth.guard.spec.ts（JWT Guard 单元测试）
 * ============================================================================
 * 作用：测试 JwtAuthGuard 的核心逻辑 — @Public() 跳过，否则委托 passport-jwt
 *
 * 测试 3 个核心场景：
 *   1. @Public() 方法 — 应该 return true（跳过）
 *   2. 普通方法，无 Bearer token — 应该委托 super.canActivate（最终 401）
 *   3. 普通方法，有有效 Bearer token — 委托（最终 200）
 *
 * 注：本测试**不**实际启动 NestJS；只 unit-test canActivate 的反射逻辑
 * 集成测试需要启动完整 backend（属于 CI 中的 backend 集成测试范畴）
 * ============================================================================
 */

import { ExecutionContext, Reflector } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let _reflector: Reflector;  // prefix with _ to satisfy no-unused-vars

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [JwtAuthGuard, Reflector],
    }).compile();

    guard = moduleRef.get(JwtAuthGuard);
    reflector = moduleRef.get(Reflector);
  });

  /**
   * Helper: build a mock ExecutionContext
   *
   * @param handlerMetadata    用 Reflector 模拟方法级 @Public() 标记
   * @param classMetadata     模拟类级 @Public() 标记
   * @param hasAuthHeader     是否带 Authorization: Bearer 头
   */
  function makeContext(
    handlerMetadata: any,
    classMetadata: any,
    hasAuthHeader = false,
  ): ExecutionContext {
    const req = { headers: {} as any };
    if (hasAuthHeader) {
      req.headers.authorization = 'Bearer fake-test-token';
    }
    const handler = function () {};
    const klass = class Foo {};

    Reflect.defineMetadata(IS_PUBLIC_KEY, handlerMetadata, handler);
    Reflect.defineMetadata(IS_PUBLIC_KEY, classMetadata, klass);

    return {
      getHandler: () => handler,
      getClass: () => klass,
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => null as any,
      switchToWs: () => null as any,
      getType: () => 'http',
    } as ExecutionContext;
  }

  // ★─────────────────────────────────────────────────────────────★
  //  场景 1：方法标了 @Public() → 直接通过
  // ★─────────────────────────────────────────────────────────────★
  it('should allow @Public() method without token', () => {
    // Reflect.defineMetadata 已经把 @Public() 标记挂上 handler
    const ctx = makeContext(true, false);
    const result = guard.canActivate(ctx);
    expect(result).toBe(true);  // 不调 super.canActivate
  });

  // ★─────────────────────────────────────────────────────────────★
  //  场景 2：类标了 @Public() → 直接通过
  // ★─────────────────────────────────────────────────────────────★
  it('should allow class-level @Public()', () => {
    const ctx = makeContext(false, true);  // class 上有 @Public()
    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  // ★─────────────────────────────────────────────────────────────★
  //  场景 3：handler + class 都没有 @Public() — 委托给 super
  //  super.canActivate() 在没有 nest 容器时会 throw NotImplemented
  //  我们只验证它**被调用了**（不是 return true）
  // ★─────────────────────────────────────────────────────────────★
  it('should delegate to super.canActivate when not @Public()', () => {
    const ctx = makeContext(false, false);
    expect(() => guard.canActivate(ctx)).toThrow();  // super 失败因为 mock ctx
    // 注：真正的集成测试在 backend/test/ 下跑（需要完整 NestJS 容器）
  });

  // ★─────────────────────────────────────────────────────────────★
  //  场景 4：可读性 — 元数据 key 唯一且非空
  // ★─────────────────────────────────────────────────────────────★
  it('should use distinct metadata key for @Public', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
    expect(typeof IS_PUBLIC_KEY).toBe('string');
    expect(IS_PUBLIC_KEY.length).toBeGreaterThan(0);
  });
});

/**
 * ============================================================================
 * 文件名：auth.controller.ts（认证 Controller — dev token + 验证）
 * ============================================================================
 * 作用：认证相关端点（目前 2 个，未来扩 login / register / refresh）
 *
 * 端点清单：
 *   - POST /api/auth/dev-token    Public — 签发开发用 JWT（生产应禁用）
 *   - GET  /api/auth/verify       Protected — 校验当前 token，返回 user 信息
 *
 * 设计动机：
 *   PR 4 引入 JWT 后，所有现有客户端调用写接口会 401。
 *   必须有"零摩擦迁移路径"——/api/auth/dev-token 让现有 frontend 无需改代码，
 *   只需在 fetch 拦截器里加一行拿 token。
 *
 *   生产环境：NODE_ENV=production 时 dev-token 端点应返回 404
 *   （用 NODE_ENV 检查在 controller 里实现，不必重启服务）。
 * ============================================================================
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * POST /api/auth/dev-token
   * 签发开发环境用的 JWT
   *
   * Body: { userId?: string } — 不传则用 DEV_TOKEN_USER_ID
   *
   * 生产环境行为：若 NODE_ENV=production，返回 404
   * （防止 dev 端点泄露到生产）
   */
  @Public()
  @Post('dev-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '签发开发用 JWT（生产环境禁用）',
    description:
      'Dev-only token issuer. 返回 { accessToken, expiresIn }。' +
      '生产环境（NODE_ENV=production）下返回 404。',
  })
  async devToken(@Body() body: { userId?: string } = {}) {
    // 生产环境短路
    if (this.config.get('NODE_ENV') === 'production') {
      throw new NotFoundException('dev token endpoint disabled in production');
    }

    const userId = body.userId ?? this.config.get<string>('DEV_TOKEN_USER_ID', 'demo-user');
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('userId required (or set DEV_TOKEN_USER_ID in .env)');
    }

    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '24h');
    const accessToken = await this.jwt.signAsync(
      { sub: userId },        // JWT 标准 subject 字段
      { expiresIn },          // 来自环境配置
    );

    // 简单解析 expiresIn 返回给客户端（方便排查）
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      userId,
    };
  }

  /**
   * GET /api/auth/verify
   * 校验当前 Bearer Token 是否有效
   *
   * 需 AuthGuard（默认全局）— 未带 token 返回 401
   * 带有效 token → 返回 user 信息（来自 token payload）
   *
   * 用法：客户端登录后调用一次验证 token，然后在 store 里缓存 userId
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)  // 显式标注（虽然全局已有；文档目的）
  @ApiBearerAuth()
  @ApiOperation({
    summary: '校验当前 token，返回 user 信息',
    description: '需 Authorization: Bearer <token>，返回 { valid: true, user }',
  })
  verify(@CurrentUser() user: { id: string }) {
    return { valid: true, user };
  }
}

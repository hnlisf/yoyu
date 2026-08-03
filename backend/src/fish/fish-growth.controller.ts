/**
 * 文件名：fish/fish-growth.controller.ts
 *
 * P4 PR 18：GET /api/fish/:id/growth-history —— 替代 frontend mock
 *
 * 鉴权：默认 JwtAuthGuard（PR 4 全局 Guard）
 */

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FishGrowthService, GrowthPoint } from './fish-growth.service';

@ApiTags('fish')
@ApiBearerAuth()
@Controller('api/fish')
@UseGuards(JwtAuthGuard)
export class FishGrowthController {
  constructor(private readonly service: FishGrowthService) {}

  @Get(':id/growth-history')
  @ApiOperation({ summary: 'Get fish growth history (替代 frontend mock)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getGrowthHistory(
    @Param('id') fishId: string,
    @Query('limit') limit?: string,
  ): Promise<GrowthPoint[]> {
    const n = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 30;
    return this.service.getGrowthHistory(fishId, n);
  }
}
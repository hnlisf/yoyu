/**
 * 文件名：stats/stats.controller.ts
 *
 * P4 PR 19：3 个统计端点（替代前端 mock）
 *   - GET /api/stats/summary
 *   - GET /api/stats/weekly
 *   - GET /api/achievements
 *
 * 鉴权：默认 JwtAuthGuard（PR 4 全局 Guard）
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatsService, UserStatsSummary, WeeklyFeedingDatum, Achievement } from './stats.service';

@ApiTags('stats')
@ApiBearerAuth()
@Controller('api')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get('stats/summary')
  @ApiOperation({ summary: '用户级整体统计（totalFish / byStatus / bySpecies / recentFish）' })
  @ApiQuery({ name: 'userId', required: true })
  async summary(@Query('userId') userId: string): Promise<UserStatsSummary> {
    return this.service.getSummary(userId);
  }

  @Get('stats/weekly')
  @ApiOperation({ summary: '喂食频次时间序列（按周聚合）' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  async weekly(
    @Query('userId') userId: string,
    @Query('weeks') weeks?: string,
  ): Promise<WeeklyFeedingDatum[]> {
    const n = weeks ? Math.min(52, Math.max(1, parseInt(weeks, 10))) : 12;
    return this.service.getWeekly(userId, n);
  }

  @Get('achievements')
  @ApiOperation({ summary: '成就解锁列表（基于用户鱼/缸数量）' })
  @ApiQuery({ name: 'userId', required: true })
  async achievements(@Query('userId') userId: string): Promise<Achievement[]> {
    return this.service.getAchievements(userId);
  }
}
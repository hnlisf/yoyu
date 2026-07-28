import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('api/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get aggregated stats for a user: summary, weekly, achievements' })
  @ApiQuery({ name: 'userId', required: true })
  async getStats(@Query('userId') userId: string) {
    return this.statsService.getStats(userId || 'demo-user');
  }
}

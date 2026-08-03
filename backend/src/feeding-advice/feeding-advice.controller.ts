import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FeedingAdviceService } from './feeding-advice.service';
// PR 4 引入
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// PR 4：喂食建议依赖用户偏好 + 天气 + 鱼种 — 用户私有场景
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('feeding-advice')
@Controller('api/feeding-advice')
export class FeedingAdviceController {
  constructor(private readonly service: FeedingAdviceService) {}

  @Get()
  @ApiOperation({ summary: 'Get per-species feeding advice based on current weather' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'lang', required: false })
  async get(
    @Query('userId') userId: string,
    @Query('lang') lang = 'zh',
  ) {
    if (!userId) throw new BadRequestException('userId required');
    return this.service.getAdviceForUser(userId, lang);
  }
}

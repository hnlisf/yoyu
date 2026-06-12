import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FeedingAdviceService } from './feeding-advice.service';

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

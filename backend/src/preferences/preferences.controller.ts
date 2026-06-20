import { BadRequestException, Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';

@ApiTags('user')
@Controller('api/user/preferences')
export class PreferencesController {
  constructor(private readonly service: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user preferences (city, etc.)' })
  @ApiQuery({ name: 'userId', required: true })
  async get(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId required');
    return this.service.get(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user preferences (city, lat, lng)' })
  async upsert(
    @Body()
    body: {
      userId: string;
      city?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    if (!body.userId) throw new BadRequestException('userId required');
    return this.service.upsert(body);
  }
}

import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FishService } from './fish.service';
import type { CreateFishDto, UpdateFishDto, FeedAmount } from './fish.service';
// PR 4 引入
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// PR 4：鱼只数据是用户私有的 — 所有方法默认要 JWT 鉴权
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('fish')
@Controller('api/fish')
export class FishController {
  constructor(private readonly service: FishService) {}

  @Get()
  @ApiOperation({ summary: 'List fish in a tank' })
  @ApiQuery({ name: 'tankId', required: true })
  @ApiQuery({ name: 'lang', required: false })
  async list(@Query('tankId') tankId: string, @Query('lang') lang?: string) {
    return this.service.findAllByTank(tankId, lang);
  }

  // IMPORTANT: specific routes must come BEFORE parameterized routes
  @Get('my')
  @ApiOperation({ summary: 'List all fish belonging to a user (across all tanks)' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'lang', required: false })
    return this.service.findAllByUser(userId, lang);
  }

  @ApiOperation({ summary: 'Get fish detail (with species + recent feed records)' })
  @ApiQuery({ name: 'lang', required: false })
    return this.service.findOne(id, lang);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new fish (tankId optional, resolves from user default)' })
  async create(@Body() body: CreateFishDto) {
    return this.service.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update fish (rename)' })
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
  async update(@Param('id') id: string, @Body() body: UpdateFishDto) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a fish' })
    return this.service.remove(id);
  }

  @Post(':id/feed')
  @ApiOperation({ summary: 'Feed a fish (validates frequency vs species)' })
    return this.service.feed(id, body?.amount ?? 'normal');
  }
}

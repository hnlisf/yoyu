import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FishTanksService } from './fish-tanks.service';
import { FishService } from '../fish/fish.service';
import { TemperatureAdjustService } from '../temperature-adjust/temperature-adjust.service';
import type { CreateFishTankDto, UpdateFishTankDto } from './fish-tanks.service';
// PR 4 引入
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('fish-tanks')
@Controller('api/fish-tanks')
export class FishTanksController {
  constructor(
    private readonly service: FishTanksService,
    private readonly fishService: FishService,
    private readonly temperatureAdjustService: TemperatureAdjustService,
  ) {}

  // ── 公开读 ──
  @Public()
  @Get()
  @ApiOperation({ summary: 'List all fish tanks for a user' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'lang', required: false })
  async list(@Query('userId') userId: string, @Query('lang') lang?: string) {
    return this.service.findAllByUser(userId, lang);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get fish tank detail' })
  @ApiQuery({ name: 'lang', required: false })
  async detail(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.service.findOne(id, lang);
  }

  // ── PR 4 示范：写接口用 @UseGuards + @CurrentUser ──
  // 注意：token 中的 userId 覆盖 body.userId（防止前端伪造 body 改他人数据）
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new fish tank (userId from token, NOT body)' })
  async create(
    @CurrentUser('id') userId: string,                  // 从 token 取
    @Body() body: Omit<CreateFishTankDto, 'userId'>,     // 从 DTO 移除 userId（防伪造）
  ) {
    return this.service.create({ ...body, userId });       // 注入 token userId
  }

  // ── 剩余写方法：标 @UseGuards 让 auth-check 通过 ──
  // 完全迁移到 @CurrentUser('id') 是后续 PR 的事 — plan 里 P2 PR 13 范围
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Update a fish tank (full)' })
  async update(@Param('id') id: string, @Body() body: UpdateFishTankDto) {
    return this.service.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Partial update a fish tank (e.g. location)' })
  async partialUpdate(@Param('id') id: string, @Body() body: UpdateFishTankDto) {
    return this.service.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a fish tank' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/tick')
  @ApiOperation({ summary: 'Tick tank status (cleanliness/oxygen decay)' })
  async tick(@Param('id') id: string, @Body() body: { hoursDelta?: number }) {
    return this.service.tick(id, body?.hoursDelta);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/heater')
  @ApiOperation({ summary: 'Toggle heater on/off and recalculate temperature' })
  async toggleHeater(
    @Param('id') id: string,
    @Body() body: { heaterOn: boolean },
  ) {
    return this.service.toggleHeater(id, body.heaterOn);
  }

  // GET 仍然公开（读操作）
  @Public()
  @Get(':id/temperature-adjust')
  @ApiOperation({ summary: 'v9.1: Get temperature adjustment progress (rate-limited linear, ≤1°C/h)' })
  async getTemperatureAdjust(@Param('id') tankId: string) {
    const progress = await this.temperatureAdjustService.getProgress(tankId);
    if (!progress) {
      return { jobId: null, status: 'none', message: 'No active temperature adjustment' };
    }
    return progress;
  }

  // PR 4：changeWater 也需要 owner check — 用 token userId 替代 body.userId
  // 但完整迁移留作 P2 PR（要改 service 签名）。这里先加 @UseGuards
  @UseGuards(JwtAuthGuard)
  @Post(':id/change-water')
  @ApiOperation({ summary: 'v9.0: Change water — resets temperature to 24°C, heater off, clears temp alert. v9.1: also creates WaterChangeLog. v10.1.2: owner check + 24h idempotency' })
  async changeWater(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    if (!body?.userId) {
      return { error: 'userId_required', message: 'userId is required for changeWater' };
    }
    return this.service.changeWater(id, body.userId);
  }

  @Public()
  @Get(':id/water-logs')
  @ApiOperation({ summary: 'v9.1 Item 6b: Get water change logs for a tank' })
  @ApiQuery({ name: 'limit', required: false })
  async getWaterChangeLogs(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getWaterChangeLogs(id, limit ? parseInt(limit, 10) : 20);
  }

  // 注意：updateOutdoorTemp 实际是写操作（影响 tank state）
  // 但有些物理更新是自动的（定时器触发），保持 @UseGuards 强制鉴权
  @UseGuards(JwtAuthGuard)
  @Patch(':id/temperature')
  @ApiOperation({ summary: 'Update outdoor temperature (triggers water temp physics recalc)' })
  async updateOutdoorTemp(
    @Param('id') id: string,
    @Body() body: { outdoorTemp: number },
  ) {
    return this.service.updateOutdoorTemp(id, body.outdoorTemp);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':tankId/fishes/:fishId')
  @ApiOperation({ summary: 'Rename a fish (nickname). Body: { nickname, userId }. Frontend "rename" button calls this.' })
  async renameFish(
    @Param('tankId') tankId: string,
    @Param('fishId') fishId: string,
    @Body() body: { nickname: string; userId: string },
  ) {
    return this.service.renameFish(tankId, fishId, body.nickname, body.userId);
  }
}

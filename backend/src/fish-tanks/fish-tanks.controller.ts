import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FishTanksService } from './fish-tanks.service';
import { FishService } from '../fish/fish.service';
import { TemperatureAdjustService } from '../temperature-adjust/temperature-adjust.service';
import type { CreateFishTankDto, UpdateFishTankDto } from './fish-tanks.service';

@ApiTags('fish-tanks')
@Controller('api/fish-tanks')
export class FishTanksController {
  constructor(
    private readonly service: FishTanksService,
    private readonly fishService: FishService,
    private readonly temperatureAdjustService: TemperatureAdjustService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all fish tanks for a user' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'lang', required: false })
  async list(@Query('userId') userId: string, @Query('lang') lang?: string) {
    return this.service.findAllByUser(userId, lang);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fish tank detail' })
  @ApiQuery({ name: 'lang', required: false })
  async detail(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.service.findOne(id, lang);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new fish tank' })
  async create(@Body() body: CreateFishTankDto) {
    return this.service.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a fish tank (full)' })
  async update(@Param('id') id: string, @Body() body: UpdateFishTankDto) {
    return this.service.update(id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partial update a fish tank (e.g. location)' })
  async partialUpdate(@Param('id') id: string, @Body() body: UpdateFishTankDto) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a fish tank' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/tick')
  @ApiOperation({ summary: 'Tick tank status (cleanliness/oxygen decay)' })
  async tick(@Param('id') id: string, @Body() body: { hoursDelta?: number }) {
    return this.service.tick(id, body?.hoursDelta);
  }

  @Post(':id/heater')
  @ApiOperation({ summary: 'Toggle heater on/off and recalculate temperature' })
  async toggleHeater(
    @Param('id') id: string,
    @Body() body: { heaterOn: boolean },
  ) {
    return this.service.toggleHeater(id, body.heaterOn);
  }

  @Get(':id/temperature-adjust')
  @ApiOperation({ summary: 'v9.1: Get temperature adjustment progress (rate-limited linear, ≤1°C/h)' })
  async getTemperatureAdjust(@Param('id') tankId: string) {
    const progress = await this.temperatureAdjustService.getProgress(tankId);
    if (!progress) {
      return { jobId: null, status: 'none', message: 'No active temperature adjustment' };
    }
    return progress;
  }

  // v10.1.2 Item 6b: changeWater now requires userId for owner check + 24h idempotency
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

  @Get(':id/water-logs')
  @ApiOperation({ summary: 'v9.1 Item 6b: Get water change logs for a tank' })
  @ApiQuery({ name: 'limit', required: false })
  async getWaterChangeLogs(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getWaterChangeLogs(id, limit ? parseInt(limit, 10) : 20);
  }

  @Patch(':id/temperature')
  @ApiOperation({ summary: 'Update outdoor temperature (triggers water temp physics recalc)' })
  async updateOutdoorTemp(
    @Param('id') id: string,
    @Body() body: { outdoorTemp: number },
  ) {
    return this.service.updateOutdoorTemp(id, body.outdoorTemp);
  }

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

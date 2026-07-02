import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TemperatureAdjustService } from './temperature-adjust.service';

/**
 * v9.1 Item 7: Temperature adjustment progress endpoint.
 * Frontend polls this every ~30s to show progress bar and remaining time.
 */
@ApiTags('temperature-adjust')
@Controller('api/fish-tanks')
export class TemperatureAdjustController {
  constructor(private readonly service: TemperatureAdjustService) {}

  @Get(':id/temperature-adjust')
  @ApiOperation({
    summary:
      'v9.1: Get temperature adjustment progress for a tank (exponential decay τ=20min)',
  })
  async getProgress(@Param('id') tankId: string) {
    const progress = await this.service.getProgress(tankId);
    if (!progress) {
      return {
        jobId: null,
        status: 'none',
        message: 'No active temperature adjustment',
      };
    }
    return progress;
  }
}

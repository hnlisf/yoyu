import { Module } from '@nestjs/common';
import { TemperatureAdjustService } from './temperature-adjust.service';

@Module({
  providers: [TemperatureAdjustService],
  exports: [TemperatureAdjustService],
})
export class TemperatureAdjustModule {}

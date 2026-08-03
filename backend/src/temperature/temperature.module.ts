import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WaterTemperatureService } from './water-temperature.service';
import { TemperatureState } from './temperature-state';

// P3 PR 16：TemperatureState 是全局状态仓库（@Global）
// —— WaterTemperatureService 写、TemperatureAdjustService 读
@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [WaterTemperatureService, TemperatureState],
  exports: [WaterTemperatureService, TemperatureState],
})
export class TemperatureModule {}

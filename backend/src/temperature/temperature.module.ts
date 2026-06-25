import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WaterTemperatureService } from './water-temperature.service';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [WaterTemperatureService],
  exports: [WaterTemperatureService],
})
export class TemperatureModule {}

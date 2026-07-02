import { Module } from '@nestjs/common';
import { FishTanksController } from './fish-tanks.controller';
import { FishTanksService } from './fish-tanks.service';
import { FishSpeciesModule } from '../fish-species/fish-species.module';
import { FishModule } from '../fish/fish.module';
import { WeatherModule } from '../weather/weather.module';
import { TemperatureAdjustModule } from '../temperature-adjust/temperature-adjust.module';

@Module({
  imports: [FishSpeciesModule, FishModule, WeatherModule, TemperatureAdjustModule],
  controllers: [FishTanksController],
  providers: [FishTanksService],
  exports: [FishTanksService],
})
export class FishTanksModule {}

import { Module } from '@nestjs/common';
import { FishTanksController } from './fish-tanks.controller';
import { FishTanksService } from './fish-tanks.service';
import { FishSpeciesModule } from '../fish-species/fish-species.module';
import { FishModule } from '../fish/fish.module';

@Module({
  imports: [FishSpeciesModule, FishModule],
  controllers: [FishTanksController],
  providers: [FishTanksService],
  exports: [FishTanksService],
})
export class FishTanksModule {}

import { Module } from '@nestjs/common';
import { FishTanksController } from './fish-tanks.controller';
import { FishTanksService } from './fish-tanks.service';

@Module({
  controllers: [FishTanksController],
  providers: [FishTanksService],
  exports: [FishTanksService],
})
export class FishTanksModule {}

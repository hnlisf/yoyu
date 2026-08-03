import { Module } from '@nestjs/common';
import { FishController } from './fish.controller';
import { FishGrowthController } from './fish-growth.controller';  // P4 PR 18
import { FishService } from './fish.service';
import { FishGrowthService } from './fish-growth.service';     // P4 PR 18
import { FishSpeciesModule } from '../fish-species/fish-species.module';

@Module({
  imports: [FishSpeciesModule],
  controllers: [FishController, FishGrowthController],
  providers: [FishService, FishGrowthService],
  exports: [FishService, FishGrowthService],
})
export class FishModule {}

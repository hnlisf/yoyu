import { Module } from '@nestjs/common';
import { FeedingAdviceController } from './feeding-advice.controller';
import { FeedingAdviceService } from './feeding-advice.service';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [WeatherModule],
  controllers: [FeedingAdviceController],
  providers: [FeedingAdviceService],
})
export class FeedingAdviceModule {}

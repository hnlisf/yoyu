import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FishSpeciesModule } from './fish-species/fish-species.module';
import { FishTanksModule } from './fish-tanks/fish-tanks.module';
import { FishModule } from './fish/fish.module';
import { WeatherModule } from './weather/weather.module';
import { LocationModule } from './location/location.module';
import { FeedingAdviceModule } from './feeding-advice/feeding-advice.module';
import { RemindersModule } from './reminders/reminders.module';
import { PreferencesModule } from './preferences/preferences.module';

@Module({
  imports: [
    PrismaModule,
    FishSpeciesModule,
    FishTanksModule,
    FishModule,
    WeatherModule,
    LocationModule,
    FeedingAdviceModule,
    RemindersModule,
    PreferencesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

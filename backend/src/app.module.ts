import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';          // PR 4 新增
import { FishSpeciesModule } from './fish-species/fish-species.module';
import { FishTanksModule } from './fish-tanks/fish-tanks.module';
import { FishModule } from './fish/fish.module';
import { WeatherModule } from './weather/weather.module';
import { LocationModule } from './location/location.module';
import { FeedingAdviceModule } from './feeding-advice/feeding-advice.module';
import { RemindersModule } from './reminders/reminders.module';
import { PreferencesModule } from './preferences/preferences.module';
import { UserModule } from './user/user.module';
import { TemperatureModule } from './temperature/temperature.module';
import { TemperatureAdjustModule } from './temperature-adjust/temperature-adjust.module';
import { StatsModule } from './stats/stats.module';           // P4 PR 19 新增
import { CitiesModule } from './cities/cities.module';
import { HealthController } from './health/health.controller';
// (end of imports)

@Module({
  imports: [
    PrismaModule,

    // ── PR 6 新增：throttler 限流 ──
    // 100 req / 60s / IP — 防止暴力破解、API 滥用
    // 第二个数组项可加更细粒度（如 login 端点独立限流）
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,    // 时间窗口：60 秒
        limit: 100,     // 单 IP 在窗口内最多 100 次
      },
    ]),

    AuthModule,                                           // PR 4 新增（注册全局 JwtAuthGuard）
    FishSpeciesModule,
    FishTanksModule,
    FishModule,
    WeatherModule,
    LocationModule,
    FeedingAdviceModule,
    RemindersModule,
    PreferencesModule,
    UserModule,
    TemperatureModule,
    TemperatureAdjustModule,
    StatsModule,                                              // P4 PR 19
    CitiesModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,

    // ── PR 6 新增：throttler 全局 Guard ──
    // 注意：执行顺序 — 先 ThrottlerGuard（429），再 JwtAuthGuard（401）
    // NestJS 按 providers 注册顺序链式调用 APP_GUARD
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

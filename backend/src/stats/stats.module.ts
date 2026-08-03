/**
 * 文件名：stats/stats.module.ts
 *
 * P4 PR 19：注册 StatsService + StatsController
 */

import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

@Module({
  providers: [StatsService],
  controllers: [StatsController],
  exports: [StatsService],
})
export class StatsModule {}
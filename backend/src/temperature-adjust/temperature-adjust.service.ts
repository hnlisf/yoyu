/**
 * ============================================================================
 * 文件名：temperature-adjust/temperature-adjust.service.ts（温度调节 Job 服务 v3）
 * ============================================================================
 * 作用：限速线性温度调节（rate-limited linear），**唯一** DB 写入者
 *
 * P3 §3.3 重构后：
 *   - 此服务**每 30 秒** tick 时读 TemperatureState 的最新温度
 *   - 计算收敛步进（≤ 1°C/h rate limit）
 *   - **唯一**写 FishTank.temp
 *   - 不再与 WaterTemperatureService 竞争（后者只写内存）
 *
 * 算法（不变）：
 *   - maxDeltaPerTick = 1 / 120 °C（30s tick 节奏，≡ ≤ 1°C/h）
 *   - 收敛条件：|newTemp - toTemp| < 0.05 → completed
 *
 * 与 WaterTemperatureService 的角色分工：
 *   - water（1Hz）→ 模拟物理 → 写 TemperatureState
 *   - adjust（30s）→ 读 state → 收敛 → 写 DB（FishTank.temp）
 *
 * @see ../temperature/temperature-state.ts
 * @see ../temperature/water-temperature.service.ts
 * ============================================================================
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemperatureState } from '../temperature/temperature-state';

@Injectable()
export class TemperatureAdjustService implements OnModuleInit {
  private readonly logger = new Logger(TemperatureAdjustService.name);
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private state: TemperatureState,
  ) {}

  onModuleInit() {
    // 30s tick 循环 —— 与 WaterTemperatureService 的 1Hz 物理 tick 异步
    this.tickTimer = setInterval(() => {
      this.tickAll().catch((err) =>
        this.logger.warn(`Temperature tick failed: ${err.message}`),
      );
    }, 30_000);
  }

  /** 创建调节 Job（取消同一鱼缸已有 running Job） */
  async createJob(
    tankId: string,
    fromTemp: number,
    toTemp: number,
    tauMinutes: number = 20,
  ): Promise<any> {
    await this.prisma.temperatureAdjustJob.updateMany({
      where: { tankId, status: 'running' },
      data: { status: 'cancelled', completedAt: new Date() },
    });

    return this.prisma.temperatureAdjustJob.create({
      data: {
        tankId,
        fromTemp,
        toTemp,
        currentTemp: fromTemp,
        algorithm: 'rate_limited_linear',
        tauMinutes,
        status: 'running',
      },
    });
  }

  /** 取消所有 running Job */
  async cancelJobs(tankId: string): Promise<void> {
    await this.prisma.temperatureAdjustJob.updateMany({
      where: { tankId, status: 'running' },
      data: { status: 'cancelled', completedAt: new Date() },
    });
  }

  async getRunningJob(tankId: string): Promise<any> {
    return this.prisma.temperatureAdjustJob.findFirst({
      where: { tankId, status: 'running' },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getProgress(tankId: string): Promise<any> {
    const job = await this.getRunningJob(tankId);
    if (!job) return null;

    // 读最新温度（来自 TemperatureState，不是 DB）
    const liveState = this.state.readForAdjust(tankId);
    return {
      jobId: job.id,
      tankId: job.tankId,
      fromTemp: job.fromTemp,
      toTemp: job.toTemp,
      currentTemp: liveState?.currentTemp ?? job.currentTemp,
      algorithm: job.algorithm,
      tauMinutes: job.tauMinutes,
      startedAt: job.startedAt,
      progress: Math.min(1, Math.abs((liveState?.currentTemp ?? job.currentTemp) - job.fromTemp) / Math.abs(job.toTemp - job.fromTemp)),
      status: job.status,
    };
  }

  /** 每 30s tick：对所有 running Job 推进一步 */
  async tickAll(): Promise<void> {
    const jobs = await this.prisma.temperatureAdjustJob.findMany({
      where: { status: 'running' },
    });

    for (const job of jobs) {
      try {
        await this.tickJob(job);
      } catch (err: any) {
        this.logger.warn(`tickJob failed for ${job.id}: ${err.message}`);
      }
    }
  }

  /** 单个 Job 推进一步 */
  private async tickJob(job: any): Promise<void> {
    // 关键：从 TemperatureState 读最新水温（1Hz 精度）
    const liveState = this.state.readForAdjust(job.tankId);
    const liveTemp = liveState?.currentTemp ?? job.currentTemp;

    const delta = job.toTemp - liveTemp;
    if (Math.abs(delta) < 0.05) {
      // 已收敛
      await this.prisma.temperatureAdjustJob.update({
        where: { id: job.id },
        data: {
          currentTemp: job.toTemp,
          status: 'completed',
          completedAt: new Date(),
        },
      });
      // 唯一 DB 写入：FishTank.temp
      await this.prisma.fishTank.update({
        where: { id: job.tankId },
        data: { temp: job.toTemp },
      });
      this.logger.log(
        `Temperature adjust completed for tank ${job.tankId}: ${job.toTemp}°C`,
      );
      return;
    }

    // 限速步进（≤ 1/120 °C / 30s tick）
    const rawDeltaPerMinute = delta / Math.max(1, job.tauMinutes);
    const maxDeltaPerTick = 1 / 120;
    const clampedDelta = Math.max(
      -maxDeltaPerTick,
      Math.min(maxDeltaPerTick, rawDeltaPerMinute * 0.5),
    );
    const newTemp = parseFloat((liveTemp + clampedDelta).toFixed(1));

    await this.prisma.temperatureAdjustJob.update({
      where: { id: job.id },
      data: { currentTemp: newTemp },
    });

    // 唯一 DB 写入：FishTank.temp
    try {
      await this.prisma.fishTank.update({
        where: { id: job.tankId },
        data: { temp: newTemp },
      });
    } catch {
      // 鱼缸可能被删除 —— 静默
    }
  }
}
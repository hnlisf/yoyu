import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * v9.1 Item 7: Temperature Adjustment Service
 *
 * Implements exponential decay algorithm for water temperature adjustment:
 *   currentTemp(t) = toTemp + (fromTemp - toTemp) × e^(-t/τ)
 *
 * Parameters:
 *   - τ = 20 minutes (time constant, half-life)
 *   - Rate limit: ≤ 1°C/hour (≤ 1/60 °C per minute)
 *   - Convergence: |currentTemp - toTemp| < 0.05 → completed
 *   - One running job per tank (enforced)
 */
@Injectable()
export class TemperatureAdjustService implements OnModuleInit {
  private readonly logger = new Logger(TemperatureAdjustService.name);
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Start the 30-second tick loop
    this.tickTimer = setInterval(() => {
      this.tickAll().catch((err) =>
        this.logger.warn(`Temperature tick failed: ${err.message}`),
      );
    }, 30_000);
  }

  /**
   * Create a new temperature adjustment job for a tank.
   * Cancels any existing running job for the same tank first (ADR-004: 1 job per tank).
   */
  async createJob(
    tankId: string,
    fromTemp: number,
    toTemp: number,
    tauMinutes: number = 20,
  ): Promise<any> {
    // Cancel any existing running job for this tank
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
        algorithm: 'exponential_decay',
        tauMinutes,
        status: 'running',
      },
    });
  }

  /**
   * Cancel all running jobs for a tank.
   */
  async cancelJobs(tankId: string): Promise<void> {
    await this.prisma.temperatureAdjustJob.updateMany({
      where: { tankId, status: 'running' },
      data: { status: 'cancelled', completedAt: new Date() },
    });
  }

  /**
   * Get the current running job for a tank (or null if none).
   */
  async getRunningJob(tankId: string): Promise<any> {
    return this.prisma.temperatureAdjustJob.findFirst({
      where: { tankId, status: 'running' },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Get temperature adjustment progress with remaining time estimate.
   */
  async getProgress(tankId: string): Promise<any> {
    const job = await this.getRunningJob(tankId);
    if (!job) return null;

    const { fromTemp, toTemp, currentTemp, tauMinutes, startedAt, status } = job;

    // Calculate remaining time: τ * ln((from - to) / (current - to))
    // Only meaningful when there's a significant delta
    let remainingSeconds: number | null = null;
    const delta = currentTemp - toTemp;
    const initDelta = fromTemp - toTemp;

    if (status === 'running' && Math.abs(delta) > 0.01 && Math.abs(initDelta) > 0.01) {
      remainingSeconds = Math.round(
        tauMinutes * 60 * Math.log(Math.abs(initDelta / delta)),
      );
    } else if (status === 'completed') {
      remainingSeconds = 0;
    }

    // Current delta per minute
    const deltaPerMinute = status === 'running'
      ? parseFloat(((toTemp - currentTemp) / tauMinutes).toFixed(3))
      : 0;

    return {
      jobId: job.id,
      fromTemp,
      toTemp,
      currentTemp,
      algorithm: job.algorithm,
      tauMinutes,
      startedAt: startedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
      status,
      remainingSeconds,
      deltaPerMinute,
    };
  }

  /**
   * Tick all running jobs every 30 seconds.
   * Applies exponential decay with rate limit protection.
   */
  async tickAll() {
    const activeJobs = await this.prisma.temperatureAdjustJob.findMany({
      where: { status: 'running' },
    });

    if (activeJobs.length === 0) return;

    for (const job of activeJobs) {
      try {
        await this.tickJob(job);
      } catch (err: any) {
        this.logger.warn(
          `Temperature tick failed for tank ${job.tankId}: ${err.message}`,
        );
      }
    }
  }

  private async tickJob(job: any) {
    const elapsedMinutes = (Date.now() - job.startedAt.getTime()) / 60000;
    const deltaFromTarget = job.toTemp - job.currentTemp;

    // Exponential decay: delta per minute = (toTemp - currentTemp) / tau
    const rawDeltaPerMinute = deltaFromTarget / job.tauMinutes;

    // Rate limit: ≤ 1°C/hour = 1/120°C per 30 seconds
    const maxDeltaPerTick = 1 / 120;
    const clampedDelta = Math.max(
      -maxDeltaPerTick,
      Math.min(maxDeltaPerTick, rawDeltaPerMinute * 0.5), // 30 sec = 0.5 min
    );

    const newTemp = parseFloat((job.currentTemp + clampedDelta).toFixed(1));

    // Check convergence: |newTemp - toTemp| < 0.05
    if (Math.abs(newTemp - job.toTemp) < 0.05) {
      await this.prisma.temperatureAdjustJob.update({
        where: { id: job.id },
        data: {
          currentTemp: job.toTemp,
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Update fish_tank.temperature to reflect final temp
      await this.prisma.fishTank.update({
        where: { id: job.tankId },
        data: { temp: job.toTemp, temperature: job.toTemp },
      });

      this.logger.log(
        `Temperature adjustment completed for tank ${job.tankId}: ${job.toTemp}°C`,
      );
    } else {
      await this.prisma.temperatureAdjustJob.update({
        where: { id: job.id },
        data: { currentTemp: newTemp },
      });

      // Also update fish_tank.temperature so frontend sees real-time value
      try {
        await this.prisma.fishTank.update({
          where: { id: job.tankId },
          data: { temp: newTemp, temperature: newTemp },
        });
      } catch {
        // Tank may have been deleted — ignore
      }
    }
  }
}

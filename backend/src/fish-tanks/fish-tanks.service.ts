import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FishTank } from '@prisma/client';

export interface CreateFishTankDto {
  userId: string;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  temp?: number;
  ph?: number;
}

export interface UpdateFishTankDto {
  name?: string;
  size?: 'small' | 'medium' | 'large';
  temp?: number;
  cleanliness?: number;
  oxygen?: number;
  ph?: number;
}

@Injectable()
export class FishTanksService {
  constructor(private prisma: PrismaService) {}

  async findAllByUser(userId: string): Promise<FishTank[]> {
    return this.prisma.fishTank.findMany({
      where: { userId },
      include: { fish: { include: { species: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string): Promise<FishTank | null> {
    return this.prisma.fishTank.findUnique({
      where: { id },
      include: { fish: { include: { species: true } } },
    });
  }

  async create(data: CreateFishTankDto): Promise<FishTank> {
    // MVP: auto-create user if it doesn't exist (no auth in MVP)
    const userId = await this.ensureUser(data.userId);
    return this.prisma.fishTank.create({
      data: {
        userId,
        name: data.name ?? '我的鱼缸',
        size: data.size ?? 'medium',
        temp: data.temp ?? 24.0,
        ph: data.ph ?? 7.0,
      },
    });
  }

  private async ensureUser(userId: string): Promise<string> {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (existing) return existing.id;
    return this.prisma.user.create({ data: { id: userId } }).then((u) => u.id);
  }

  async update(id: string, data: UpdateFishTankDto): Promise<FishTank> {
    await this.ensureExists(id);
    return this.prisma.fishTank.update({ where: { id }, data });
  }

  async remove(id: string): Promise<FishTank> {
    await this.ensureExists(id);
    return this.prisma.fishTank.delete({ where: { id } });
  }

  /**
   * Tick the tank status:
   * - cleanliness decays each day
   * - oxygen decays each day
   * - ph drifts slightly
   * Returns the updated tank.
   */
  async tick(id: string, hoursDelta: number = 24): Promise<FishTank> {
    const tank = await this.findOne(id);
    if (!tank) throw new NotFoundException('Fish tank not found');
    const decay = (hoursDelta / 24) * 5; // 5% per day
    return this.prisma.fishTank.update({
      where: { id },
      data: {
        cleanliness: Math.max(0, tank.cleanliness - decay),
        oxygen: Math.max(0, tank.oxygen - decay * 0.8),
        ph: Math.max(5, Math.min(9, tank.ph + (Math.random() - 0.5) * 0.05)),
      },
    });
  }

  private async ensureExists(id: string) {
    const tank = await this.prisma.fishTank.findUnique({ where: { id } });
    if (!tank) throw new NotFoundException('Fish tank not found');
  }
}

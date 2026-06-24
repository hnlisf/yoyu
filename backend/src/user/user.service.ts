import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DefaultTankResult {
  defaultTankId: string | null;
  tankName?: string;
}

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getDefaultTank(userId: string): Promise<DefaultTankResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { defaultTank: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Already has a default tank set — return it
    if (user.defaultTankId && user.defaultTank) {
      return {
        defaultTankId: user.defaultTankId,
        tankName: user.defaultTank.name,
      };
    }

    // No default tank set — find the user's first tank and promote it
    const firstTank = await this.prisma.fishTank.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (firstTank) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { defaultTankId: firstTank.id },
      });

      return {
        defaultTankId: firstTank.id,
        tankName: firstTank.name,
      };
    }

    // No tanks at all
    return { defaultTankId: null };
  }

  async setDefaultTank(tankId: string): Promise<DefaultTankResult> {
    // Find the tank to verify it exists and get its userId
    const tank = await this.prisma.fishTank.findUnique({
      where: { id: tankId },
    });

    if (!tank) {
      throw new NotFoundException('Tank not found');
    }

    // Update user's defaultTankId
    await this.prisma.user.update({
      where: { id: tank.userId },
      data: { defaultTankId: tankId },
    });

    return {
      defaultTankId: tankId,
      tankName: tank.name,
    };
  }
}

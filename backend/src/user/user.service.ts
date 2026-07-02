import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DefaultTankResult {
  defaultTankId: string | null;
  tankName?: string;
}

export interface MyFishItem {
  fishId: string;
  fishName: string;
  nickname: string;
  tankId: string;
  tankName: string;
  daysInTank: number;
  status: string | null;
}

export interface MyFishListResult {
  total: number;
  page: number;
  items: MyFishItem[];
}

function parseI18nName(nameI18n: string): string {
  try {
    const parsed = JSON.parse(nameI18n);
    return parsed['zh'] || parsed['en'] || parsed['ja'] || Object.values(parsed)[0] as string || '';
  } catch {
    return nameI18n;
  }
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

  /**
   * v9.1 Item 5: Get all fish belonging to the user (across all tanks) with pagination.
   */
  async getMyFishes(userId: string, page: number = 1, limit: number = 20): Promise<MyFishListResult> {
    // Get all tank IDs belonging to this user
    const tanks = await this.prisma.fishTank.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    const tankIds = tanks.map((t) => t.id);
    const tankNameMap = new Map(tanks.map((t) => [t.id, t.name]));

    // Count total fish across all user tanks
    const total = tankIds.length > 0
      ? await this.prisma.fish.count({ where: { tankId: { in: tankIds } } })
      : 0;

    // Fetch paginated fish with species
    const fish = tankIds.length > 0
      ? await this.prisma.fish.findMany({
          where: { tankId: { in: tankIds } },
          include: { species: true },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const now = Date.now();
    const items: MyFishItem[] = fish.map((f) => ({
      fishId: f.id,
      fishName: parseI18nName(f.species.nameI18n),
      nickname: f.name || '',
      tankId: f.tankId,
      tankName: tankNameMap.get(f.tankId) || '',
      daysInTank: Math.floor((now - f.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      status: f.status,
    }));

    return { total, page, items };
  }
}

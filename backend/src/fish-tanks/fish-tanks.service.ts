import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FishTank, Prisma } from '@prisma/client';
import { FishSpeciesService } from '../fish-species/fish-species.service';
import { FishService } from '../fish/fish.service';
import { WaterTemperatureService } from '../temperature/water-temperature.service';

export interface CreateFishTankDto {
  userId?: string;
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

// v9.0: max tanks per user
const MAX_TANKS_PER_USER = 6;

@Injectable()
export class FishTanksService {
  constructor(
    private prisma: PrismaService,
    private speciesService: FishSpeciesService,
    private fishService: FishService,
    private waterTemp: WaterTemperatureService,
  ) {
    // Register flush callback: persist temperature to DB every ~30s
    this.waterTemp.onFlush(async (tankId, temp) => {
      try {
        await this.prisma.fishTank.update({
          where: { id: tankId },
          data: { temp },
        });
      } catch { /* tank may have been deleted */ }
    });
  }

  async findAllByUser(userId: string, lang = 'zh'): Promise<any[]> {
    const tanks = await this.prisma.fishTank.findMany({
      where: { userId },
      include: { fish: { include: { species: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return tanks.map((t) => this.attachI18n(t, lang));
  }

  async findOne(id: string, lang = 'zh'): Promise<any> {
    const tank = await this.prisma.fishTank.findUnique({
      where: { id },
      include: { fish: { include: { species: true } } },
    });
    if (!tank) throw new NotFoundException(`Fish tank ${id} not found`);
    const result = this.attachI18n(tank, lang);
    // Auto-register with physics engine so temperature tracks in real-time
    if (this.waterTemp.getCurrentTemp(id) === null) {
      this.waterTemp.register(
        id,
        tank.temp ?? tank.cityTemp ?? 24,
        tank.cityTemp ?? 20,
        tank.heaterOn ?? false,
      );
    }
    // v9.0: Include weatherSync and tempAlert in response
    return {
      ...result,
      cityTemp: result.cityTemp ?? 0,
      heaterOn: result.heaterOn ?? false,
      temperature: result.temperature ?? result.temp ?? 24,
      weatherSync: result.weatherSync ?? null,
      tempAlert: result.tempAlert ?? null,
      fishCount: result.fish?.length ?? 0,
    };
  }

  /**
   * Toggle the heater for a tank and engage the physics engine.
   */
  async toggleHeater(
    tankId: string,
    heaterOn: boolean,
  ): Promise<{ heaterOn: boolean; currentTemp: number }> {
    const tank = await this.prisma.fishTank.findUnique({ where: { id: tankId } });
    if (!tank) throw new NotFoundException('Fish tank not found');

    const tracked = this.waterTemp.getCurrentTemp(tankId);
    if (tracked === null) {
      this.waterTemp.register(
        tankId,
        tank.temp ?? tank.cityTemp ?? 24,
        tank.cityTemp ?? 20,
        heaterOn,
      );
    } else {
      this.waterTemp.setHeaterOn(tankId, heaterOn);
    }

    await this.prisma.fishTank.update({
      where: { id: tankId },
      data: { heaterOn },
    });

    const currentTemp = this.waterTemp.getCurrentTemp(tankId) ?? tank.temp;
    return { heaterOn, currentTemp };
  }

  /**
   * Update outdoor temperature for a tank.
   */
  async updateOutdoorTemp(
    tankId: string,
    outdoorTemp: number,
  ): Promise<{ tankId: string; outdoorTemp: number; waterTemp: number }> {
    const tank = await this.prisma.fishTank.findUnique({ where: { id: tankId } });
    if (!tank) throw new NotFoundException('Fish tank not found');

    await this.prisma.fishTank.update({
      where: { id: tankId },
      data: { cityTemp: outdoorTemp },
    });

    if (this.waterTemp.getCurrentTemp(tankId) === null) {
      this.waterTemp.register(tankId, tank.temp ?? outdoorTemp, outdoorTemp, tank.heaterOn ?? false);
    } else {
      this.waterTemp.updateOutdoorTemp(tankId, outdoorTemp);
    }

    const waterTemp = this.waterTemp.getCurrentTemp(tankId) ?? tank.temp;
    return { tankId, outdoorTemp, waterTemp };
  }

  // v9.0 REQ-7: changeWater endpoint — resets temperature to 24°C, heaterOff, clears tempAlert
  async changeWater(tankId: string): Promise<{ id: string; temperature: number; heaterOn: boolean; cityTemp: number }> {
    const tank = await this.prisma.fishTank.findUnique({ where: { id: tankId } });
    if (!tank) throw new NotFoundException('Fish tank not found');

    await this.prisma.fishTank.update({
      where: { id: tankId },
      data: {
        temperature: 24.0,
        heaterOn: false,
        tempAlert: JSON.stringify({ isOverTemp: false, threshold: null, dismissedAt: new Date().toISOString() }),
      },
    });

    // Update physics engine
    this.waterTemp.reset(tankId, 24.0);

    return {
      id: tankId,
      temperature: 24.0,
      heaterOn: false,
      cityTemp: tank.cityTemp ?? 24,
    };
  }

  private attachI18n(tank: any, lang: string) {
    if (tank.fish) {
      tank.fish = tank.fish.map((f: any) => {
        if (f.species) f.species = this.speciesService.toI18n(f.species, lang);
        return f;
      });
    }
    return tank;
  }

  async create(data: CreateFishTankDto): Promise<FishTank> {
    const userId = data.userId
      ? await this.ensureUser(data.userId)
      : await this.createDemoUser();

    // v9.0 REQ-6: max tanks check
    const tankCount = await this.prisma.fishTank.count({ where: { userId } });
    if (tankCount >= MAX_TANKS_PER_USER) {
      throw new BadRequestException('用户最多6个鱼缸，已达上限');
    }

    const tankName = data.name ?? '我的鱼缸';

    // MBE.1: prevent duplicate tank names for the same user
    const existing = await this.prisma.fishTank.findFirst({
      where: { userId, name: tankName },
    });
    if (existing) {
      throw new ConflictException({
        error: 'DUPLICATE_TANK_NAME',
        message: `你已经有一个叫「${tankName}」的鱼缸了`,
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const tank = await tx.fishTank.create({
          data: {
            userId,
            name: tankName,
            size: data.size ?? 'medium',
            temp: data.temp ?? 24.0,
            ph: data.ph ?? 7.0,
            temperature: data.temp ?? 24.0,
          },
        });

        const defaultSpecies = await tx.fishSpecies.findFirst({
          where: { isDefault: true },
        });

        if (defaultSpecies) {
          await tx.fish.create({
            data: {
              tankId: tank.id,
              speciesId: defaultSpecies.id,
              name: '',
              stage: 'fry',
              growth: 0,
              health: 100,
              nutrition: 100,
              mood: 80,
              instanceId: `inst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            },
          });
        }

        return tank;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({
          error: 'DUPLICATE_TANK_NAME',
          message: `你已经有一个叫「${tankName}」的鱼缸了`,
        });
      }
      throw e;
    }
  }

  private async ensureUser(userId: string): Promise<string> {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (existing) return existing.id;
    return (await this.prisma.user.create({ data: { id: userId } })).id;
  }

  private async createDemoUser(): Promise<string> {
    const latest = await this.prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
    if (latest) return latest.id;
    return (await this.prisma.user.create({ data: {} })).id;
  }

  async update(id: string, data: UpdateFishTankDto): Promise<FishTank> {
    await this.ensureExists(id);
    return this.prisma.fishTank.update({ where: { id }, data });
  }

  async remove(id: string): Promise<FishTank> {
    await this.ensureExists(id);
    return this.prisma.fishTank.delete({ where: { id } });
  }

  async tick(id: string, hoursDelta: number = 24): Promise<any> {
    const tank = await this.prisma.fishTank.findUnique({
      where: { id },
      include: { fish: { include: { species: true } } },
    });
    if (!tank) throw new NotFoundException('Fish tank not found');

    const decay = (hoursDelta / 24) * 5;

    const warnings: any[] = [];
    const fishUpdates: Promise<any>[] = [];
    for (const fish of tank.fish) {
      const species = fish.species;
      const currentTemp = tank.temp ?? tank.cityTemp ?? 24;
      if (
        species.tempMin != null && species.tempMax != null &&
        (currentTemp < species.tempMin || currentTemp > species.tempMax)
      ) {
        const moodDrop = -5 * (hoursDelta / 1);
        const newMood = Math.max(0, (fish.mood ?? 80) + moodDrop);
        fishUpdates.push(
          this.prisma.fish.update({
            where: { id: fish.id },
            data: { mood: newMood },
          }),
        );
        warnings.push({
          fishId: fish.id,
          fishName: fish.name || `鱼#${fish.id.slice(-4)}`,
          currentTemp,
          suitableRange: { min: species.tempMin, max: species.tempMax },
          severity: currentTemp > species.tempMax + 5 || currentTemp < species.tempMin - 5
            ? 'high' : 'medium',
        });
      }
    }

    const updated = await this.prisma.fishTank.update({
      where: { id },
      data: {
        cleanliness: Math.max(0, tank.cleanliness - decay),
        oxygen: Math.max(0, tank.oxygen - decay * 0.8),
        ph: Math.max(5, Math.min(9, tank.ph + (Math.random() - 0.5) * 0.05)),
      },
    });

    await Promise.all(fishUpdates);

    return { ...updated, tempWarnings: warnings };
  }

  private async ensureExists(id: string) {
    const tank = await this.prisma.fishTank.findUnique({ where: { id } });
    if (!tank) throw new NotFoundException('Fish tank not found');
  }
}

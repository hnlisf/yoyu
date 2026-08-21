import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FishTank, Prisma, WaterChangeLog } from '@prisma/client';
// P2 PR 12 新增
import { validateNickname } from '../common/validators/text';
import { FishSpeciesService } from '../fish-species/fish-species.service';
import { FishService } from '../fish/fish.service';
import { WaterTemperatureService } from '../temperature/water-temperature.service';
import { WeatherService } from '../weather/weather.service';
import { TemperatureAdjustService } from '../temperature-adjust/temperature-adjust.service';
import { UserService } from '../user/user.service';

export interface CreateFishTankDto {
  userId?: string;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  temp?: number;
  ph?: number;
  location?: string;
  initialWaterTemp?: number;
}

export interface UpdateFishTankDto {
  name?: string;
  size?: 'small' | 'medium' | 'large';
  temp?: number;
  cleanliness?: number;
  oxygen?: number;
  ph?: number;
  location?: string;
  city?: string;  // v10.0: alias for location (per-tank city)
}

// v9.0: max tanks per user
const MAX_TANKS_PER_USER = 6;

// v10.1.2: changeWater 24h idempotency window (in hours)
const WATER_CHANGE_COOLDOWN_HOURS = 24;

@Injectable()
export class FishTanksService {
  private readonly logger = new Logger(FishTanksService.name);

  constructor(
    private prisma: PrismaService,
    private speciesService: FishSpeciesService,
    private fishService: FishService,
    private waterTemp: WaterTemperatureService,
    private weatherService: WeatherService,
    private temperatureAdjustService: TemperatureAdjustService,
    private userService: UserService,
  ) {
    // P3 §3.3 PR 16：移除 flushCallback 接线
    // —— 温度 DB 写入由 TemperatureAdjustService 统一负责
    // —— WaterTemperatureService 只更新内存状态
  }

  async findAllByUser(userId: string, lang = 'zh'): Promise<FishTank[]> {
    const tanks = await this.prisma.fishTank.findMany({
      where: { userId },
      include: { fish: { include: { species: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return tanks.map((t) => this.attachI18n(t, lang));
  }

  async findOne(id: string, lang = 'zh'): Promise<FishTank | null> {
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
    // P3 PR 17：删除 temperature 双列后，HTTP 响应仍保留同名字段（向后兼容）
    return {
      ...result,
      cityTemp: result.cityTemp ?? 0,
      heaterOn: result.heaterOn ?? false,
      temperature: result.temp,  // 仅用 temp（temperature 列已删）
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
  // v9.1 Item 6b: also creates a WaterChangeLog record
  // v10.1.2 Item 6b: owner check (403) + 24h idempotency guard via WaterChangeLog
  async changeWater(
    tankId: string,
    userId: string,
  ): Promise<{ id: string; temperature: number; heaterOn: boolean; cityTemp: number }> {
    const tank = await this.prisma.fishTank.findUnique({ where: { id: tankId } });
    if (!tank) throw new NotFoundException('Fish tank not found');

    // v10.1.2: ownership check — non-owner returns 403
    if (tank.userId !== userId) {
      throw new ForbiddenException('You are not the owner of this tank');
    }

    // v10.1.2: 24h idempotency guard — check last water change within cooldown window
    const lastChange = await this.prisma.waterChangeLog.findFirst({
      where: { tankId },
      orderBy: { changedAt: 'desc' },
    });
    if (lastChange) {
      const hoursSinceLastChange =
        (Date.now() - lastChange.changedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastChange < WATER_CHANGE_COOLDOWN_HOURS) {
        throw new BadRequestException({
          message: 'tank_already_fresh',
          lastChangedAt: lastChange.changedAt.toISOString(),
          cooldownHours: WATER_CHANGE_COOLDOWN_HOURS,
          remainingHours: Math.ceil(WATER_CHANGE_COOLDOWN_HOURS - hoursSinceLastChange),
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.fishTank.update({
        where: { id: tankId },
        data: {
          temp: 24.0,  // P3 PR 17：删 temperature 双列
          heaterOn: false,
          tempAlert: JSON.stringify({ isOverTemp: false, threshold: null, dismissedAt: new Date().toISOString() }),
        },
      });

      // v9.1 Item 6b: Log the water change
      await tx.waterChangeLog.create({
        data: {
          tankId,
          waterStatus: 'changed',
        },
      });
    });

    // Update physics engine
    this.waterTemp.reset(tankId, 24.0);

    return {
      id: tankId,
      temperature: 24.0,  // P3 PR 17：响应字段保留同名（前端兼容），实际值从 temp 读
      heaterOn: false,
      cityTemp: tank.cityTemp ?? 24,
    };
  }

  /**
   * v9.1 Item 6b: Get water change logs for a tank, ordered by most recent first.
   */
  async getWaterChangeLogs(tankId: string, limit: number = 20): Promise<WaterChangeLog[]> {
    // Verify tank exists
    await this.ensureExists(tankId);

    return this.prisma.waterChangeLog.findMany({
      where: { tankId },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * v10.1.2 Item 4: Rename a fish (nickname).
   * Validates: non-empty, 1-20 chars, no emoji, no HTML tags.
   * Checks tank ownership via userId (403 if not owner).
   */
  async renameFish(
    tankId: string,
    fishId: string,
    nickname: string,
    userId: string,
  ): Promise<FishTank> {
    // P2 PR 12: nickname 校验改用 src/common/validators/text.ts 单一来源
    const result = validateNickname(nickname);
    if (!result.ok) {
      throw new BadRequestException(result.message);
    }
    const trimmed = String(nickname).trim();
    // No emoji
    if (
      /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(trimmed) ||
      /[\u2600-\u27BF]/.test(trimmed) ||
      /[\uFE00-\uFE0F]/.test(trimmed) ||
      /\u200D/.test(trimmed)
    ) {
      throw new BadRequestException('昵称不能包含表情符号');
    }
    // No emoji check 已迁到 validateNickname helper（P2 PR 12）

    // Check fish exists and belongs to the specified tank
    const fish = await this.prisma.fish.findUnique({
      where: { id: fishId },
      include: { tank: true },
    });
    if (!fish) throw new NotFoundException('鱼不存在');
    if (fish.tankId !== tankId) {
      throw new NotFoundException('鱼不属于该鱼缸');
    }

    // Check tank ownership
    const tank = await this.prisma.fishTank.findUnique({ where: { id: tankId } });
    if (!tank) throw new NotFoundException('鱼缸不存在');
    if (tank.userId !== userId) {
      throw new ForbiddenException('无权操作该鱼缸');
    }

    return this.prisma.fish.update({
      where: { id: fishId },
      data: { name: trimmed } as any,
    });
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
      ? await this.userService.ensureUser(data.userId)
      : await this.userService.createDemoUser();

    // v9.0 REQ-6: max tanks check
    const tankCount = await this.prisma.fishTank.count({ where: { userId } });
    if (tankCount >= MAX_TANKS_PER_USER) {
      throw new BadRequestException('用户最多6个鱼缸，已达上限');
    }

    const tankName = data.name ?? '我的鱼缸';
    const location = data.location ?? 'Beijing';

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

    // v9.1 item6a: Validate city via geocode API
    const coords = await this.weatherService.geocodeCity(location);
    if (!coords) {
      throw new BadRequestException(`Invalid city: "${location}". Please provide a valid city name.`);
    }

    // v9.1 item6a: Fetch weather for the location to determine target temp
    let cityTemp = 25.0; // fallback
    try {
      const weather = await this.weatherService.getWeatherByCity(location);
      if (weather) {
        cityTemp = weather.temp;
      }
    } catch {
      this.logger.warn(`Weather fetch failed for ${location}, using fallback 25°C`);
    }

    const initialWaterTemp = data.initialWaterTemp ?? cityTemp;

    try {
      const tank = await this.prisma.$transaction(async (tx) => {
        const newTank = await tx.fishTank.create({
          data: {
            userId,
            name: tankName,
            size: data.size ?? 'medium',
            temp: initialWaterTemp,
            ph: data.ph ?? 7.0,
            location,
            lastWeatherFetchAt: new Date(),
            cityTemp,
          },
        });

        const defaultSpecies = await tx.fishSpecies.findFirst({
          where: { isDefault: true },
        });

        if (defaultSpecies) {
          await tx.fish.create({
            data: {
              tankId: newTank.id,
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

        return newTank;
      });

      // v9.1 item7: Create temperature adjust job for the initial temperature sync
      // Only if there's a meaningful difference between initialWaterTemp and cityTemp
      if (Math.abs(initialWaterTemp - cityTemp) > 0.1) {
        await this.temperatureAdjustService.createJob(
          tank.id,
          initialWaterTemp,
          cityTemp,
        );
      }

      return {
        id: tank.id,
        name: tank.name,
        location: tank.location,
        temp: initialWaterTemp,
        lastWeatherFetchAt: new Date(),
        temperatureAdjustJob: await this.temperatureAdjustService.getProgress(tank.id),
      };
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

  async update(id: string, data: UpdateFishTankDto): Promise<FishTank> {
    await this.ensureExists(id);

    // v10.0 P0-1: Validate tank name (1-20 chars, trim)
    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (trimmed.length === 0) {
        throw new BadRequestException({
          error: 'NAME_EMPTY',
          message: '鱼缸名称不能为空',
        });
      }
      if (trimmed.length > 20) {
        throw new BadRequestException({
          error: 'NAME_TOO_LONG',
          message: '鱼缸名称不能超过 20 个字符',
        });
      }
      data.name = trimmed;
    }

    // v10.0 P0-4: Accept 'city' as alias for 'location'
    const cityValue = (data as any).city;
    if (cityValue !== undefined && data.location === undefined) {
      data.location = cityValue;
    }

    // v9.1 item6a: If location changed, fetch new weather and create temp adjust job
    if (data.location) {
      const tank = await this.prisma.fishTank.findUnique({ where: { id } });
      if (!tank) throw new NotFoundException('Fish tank not found');

      const oldLocation = tank.location;
      if (data.location !== oldLocation) {
        // v9.1 item6a: Validate city via geocode API
        const coords = await this.weatherService.geocodeCity(data.location);
        if (!coords) {
          throw new BadRequestException(`Invalid city: "${data.location}". Please provide a valid city name.`);
        }

        // Cancel existing temp adjust job
        await this.temperatureAdjustService.cancelJobs(id);

        // Fetch weather for new location
        let cityTemp = 25.0;
        try {
          const weather = await this.weatherService.getWeatherByCity(data.location);
          if (weather) {
            cityTemp = weather.temp;
          }
        } catch {
          this.logger.warn(`Weather fetch failed for ${data.location}, using fallback 25°C`);
        }

        // Update tank with new location and weather
        await this.prisma.fishTank.update({
          where: { id },
          data: {
            ...data,
            cityTemp,
            lastWeatherFetchAt: new Date(),
          },
        });

        // P3 PR 17：tank.temp 是唯一温度源（已删 tank.temperature 双列）
        const currentTemp = tank.temp ?? 24;
        if (Math.abs(currentTemp - cityTemp) > 0.1) {
          await this.temperatureAdjustService.createJob(id, currentTemp, cityTemp);
        }

        return {
          id,
          name: data.name ?? tank.name,
          location: data.location,
          temp: currentTemp,
          lastWeatherFetchAt: new Date(),
          temperatureAdjustJob: await this.temperatureAdjustService.getProgress(id),
        };
      }
    }

    // No location change or no location provided — simple update
    const updated = await this.prisma.fishTank.update({ where: { id }, data });
    return updated;
  }

  async remove(id: string): Promise<FishTank> {
    await this.ensureExists(id);
    return this.prisma.fishTank.delete({ where: { id } });
  }

  async tick(id: string, hoursDelta: number = 24): Promise<FishTank> {
    const tank = await this.prisma.fishTank.findUnique({
      where: { id },
      include: { fish: { include: { species: true } } },
    });
    if (!tank) throw new NotFoundException('Fish tank not found');

    const decay = (hoursDelta / 24) * 5;

    const warnings: any[] = [];
    const fishUpdates: Promise<FishTank>[] = [];
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
            data: { mood: newMood } as any,
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

    return { ...updated };
  }

  private async ensureExists(id: string) {
    const tank = await this.prisma.fishTank.findUnique({ where: { id } });
    if (!tank) throw new NotFoundException('Fish tank not found');
  }
}

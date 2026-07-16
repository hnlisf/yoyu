import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FishSpecies } from '@prisma/client';

@Injectable()
export class FishSpeciesService {
  constructor(private prisma: PrismaService) {}

  async findAll(lang = 'zh'): Promise<any[]> {
    const list = await this.prisma.fishSpecies.findMany({
      where: { OR: [{ isDefault: true }, { userCustomized: true }] },
      orderBy: { id: 'asc' },
    });
    return list.map((s) => this.toI18n(s, lang));
  }

  async findOne(id: string, lang = 'zh'): Promise<any> {
    const s = await this.prisma.fishSpecies.findUnique({ where: { id } });
    if (!s) return null;
    return this.toI18n(s, lang);
  }

  async createCustom(data: {
    nameI18n: any;
    descI18n?: any;
    tempMin: number;
    tempMax: number;
    phMin: number;
    phMax: number;
    growthDays: number;
    feedFreq: string;
    stages?: any;
    color?: string;
    visualVariant?: { color: string; pattern: string; body: string }; // v10.1.3-w3b: 5×5×5 values
  }): Promise<FishSpecies> {
    // DB columns are String (we store JSON-encoded), so stringify if client sent objects
    const nameI18nStr =
      typeof data.nameI18n === 'string' ? data.nameI18n : JSON.stringify(data.nameI18n ?? {});
    const descI18nStr =
      typeof data.descI18n === 'string' ? data.descI18n : JSON.stringify(data.descI18n ?? {});
    const stagesStr =
      typeof data.stages === 'string' ? data.stages : JSON.stringify(data.stages ?? []);

    // Validation
    if (!nameI18nStr || nameI18nStr === '{}')
      throw new BadRequestException('鱼种名称不能为空');
    if (data.tempMin <= 0)
      throw new BadRequestException('最低温度必须大于 0°C');
    if (data.tempMin >= data.tempMax)
      throw new BadRequestException('最低温度必须小于最高温度');
    if (data.phMin >= data.phMax)
      throw new BadRequestException('最低pH必须小于最高pH');
    if (data.growthDays <= 0)
      throw new BadRequestException('生长天数必须大于0');

    // v9.1 item1: validate and stringify visualVariant
    let visualVariantStr: string | undefined;
    if (data.visualVariant) {
      // v10.1.3: Parse JSON string if client sends stringified (matching nameI18n/descI18n/stages pattern)
      const vv = typeof data.visualVariant === 'string'
        ? JSON.parse(data.visualVariant)
        : data.visualVariant;
      const missing: string[] = [];
      if (typeof vv.color !== 'string' || !vv.color) missing.push('color');
      if (typeof vv.pattern !== 'string' || !vv.pattern) missing.push('pattern');
      if (typeof vv.body !== 'string' || !vv.body) missing.push('body');
      if (missing.length > 0) {
        throw new BadRequestException(
          `visualVariant 缺少必填字段: ${missing.join(', ')}`,
        );
      }
      // v10.1.3-w3b: whitelist validation — 5 colors × 5 patterns × 5 body types = 125 combinations
      // v10.1.4: aligned with Tomas architecture §2.2 — 5×5×5=125 spec
      // v10.1.4 FAIL-9: legacy visualVariant mapping — convert old 3-option values to new 5×5×5
      const LEGACY_VV_MAPPING: Record<string, Record<string, string>> = {
        color: { purple: 'blue' },   // purple→blue (indigo approximation)
        pattern: { spotted: 'spots', striped: 'stripe' },
        body: { slim: 'elongated' },
      };
      if (LEGACY_VV_MAPPING.color[vv.color]) vv.color = LEGACY_VV_MAPPING.color[vv.color];
      if (LEGACY_VV_MAPPING.pattern[vv.pattern]) vv.pattern = LEGACY_VV_MAPPING.pattern[vv.pattern];
      if (LEGACY_VV_MAPPING.body[vv.body]) vv.body = LEGACY_VV_MAPPING.body[vv.body];

      const ALLOWED_VV = {
        color: ['red', 'orange', 'yellow', 'green', 'blue'],
        pattern: ['solid', 'stripe', 'spots', 'gradient', 'camouflage'],
        body: ['oval', 'diamond', 'streamlined', 'disc', 'elongated'],
      };
      if (!ALLOWED_VV.color.includes(vv.color)) {
        throw new BadRequestException(`visualVariant.color 不合法: ${vv.color}`);
      }
      if (!ALLOWED_VV.pattern.includes(vv.pattern)) {
        throw new BadRequestException(`visualVariant.pattern 不合法: ${vv.pattern}`);
      }
      if (!ALLOWED_VV.body.includes(vv.body)) {
        throw new BadRequestException(`visualVariant.body 不合法: ${vv.body}`);
      }
      visualVariantStr = JSON.stringify(vv);
    }

    return this.prisma.fishSpecies.create({
      data: {
        nameI18n: nameI18nStr,
        descI18n: descI18nStr,
        tempMin: data.tempMin,
        tempMax: data.tempMax,
        phMin: data.phMin,
        phMax: data.phMax,
        growthDays: data.growthDays,
        feedFreq: data.feedFreq,
        stages: stagesStr,
        color: data.color || '#5BA9C7',
        visualVariant: visualVariantStr,
        isDefault: false,
        userCustomized: true, // v9.0 REQ-4: mark as user-created
      },
    });
  }

  /**
   * Delete a custom fish species. Rules:
   * - isDefault=true (system species): 403
   * - isDefault=false but referenced by fish: 409 Conflict
   * - isDefault=false and no fish references: 204 (hard delete)
   */
  async delete(id: string): Promise<void> {
    const species = await this.prisma.fishSpecies.findUnique({ where: { id } });
    if (!species) {
      throw new NotFoundException('鱼种不存在');
    }
    if (species.isDefault) {
      throw new ForbiddenException('系统内置鱼种不可删除');
    }
    // Check if any fish reference this species
    const fishCount = await this.prisma.fish.count({ where: { speciesId: id } });
    if (fishCount > 0) {
      throw new ConflictException('该鱼种下有鱼，请先删除鱼后再删除鱼种');
    }
    await this.prisma.fishSpecies.delete({ where: { id } });
  }

  toI18n(s: FishSpecies, lang: string) {
    let nameI18n: Record<string, string> = {};
    let descI18n: Record<string, string> = {};
    let stages: any[] = [];
    try { nameI18n = JSON.parse(s.nameI18n); } catch {}
    try { descI18n = JSON.parse(s.descI18n); } catch {}
    try { stages = JSON.parse(s.stages); } catch {}
    // v9.1 item1: parse visualVariant from JSON field
    let visualVariant: any = undefined;
    if ((s as any).visualVariant) {
      try { visualVariant = JSON.parse((s as any).visualVariant); } catch {}
    }
    const zhName = nameI18n['zh'] || '';
    return {
      id: s.id,
      name: nameI18n[lang] || zhName || s.nameI18n,
      description: descI18n[lang] || descI18n['zh'] || '',
      tempMin: s.tempMin,
      tempMax: s.tempMax,
      phMin: s.phMin,
      phMax: s.phMax,
      growthDays: s.growthDays,
      feedFreq: s.feedFreq,
      stages,
      color: s.color,
      isDefault: s.isDefault,
      userCustomized: (s as any).userCustomized ?? false,
      feedRefuseHint: (s as any).feedRefuseHint,
      visualVariant,
      variant: this.resolveVariant(zhName),
    };
  }

  private resolveVariant(name: string): string {
    const n = name.toLowerCase();
    if (/goldfish|金鱼|金鲫|草金/i.test(n)) return 'goldfish';
    if (/guppy|孔雀|玛丽/i.test(n)) return 'guppy';
    if (/tetra|neon|灯鱼|灯科|霓虹|小型鱼|青鳉|platy/i.test(n)) return 'tetra';
    if (/koi|carp|锦鲤|红鲤/i.test(n)) return 'koi';
    if (/angel|angelfish|神仙鱼/i.test(n)) return 'angelfish';
    if (/betta|斗鱼/i.test(n)) return 'betta';
    if (/cory|corydoras|鼠鱼/i.test(n)) return 'cory';
    if (/pleco|plecostomus|异形/i.test(n)) return 'pleco';
    if (/oto|otocinclus|清道夫/i.test(n)) return 'otocinclus';
    if (/tropical|molly|gourami|热带鱼|七彩/i.test(n)) return 'tropical';
    return 'guppy';
  }
}

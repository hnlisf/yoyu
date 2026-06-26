import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FishSpecies } from '@prisma/client';

@Injectable()
export class FishSpeciesService {
  constructor(private prisma: PrismaService) {}

  async findAll(lang = 'zh'): Promise<any[]> {
    const list = await this.prisma.fishSpecies.findMany({ where: { isDefault: true } });
    return list.map((s) => this.toI18n(s, lang));
  }

  async findOne(id: string, lang = 'zh'): Promise<any> {
    const s = await this.prisma.fishSpecies.findUnique({ where: { id } });
    if (!s) return null;
    return this.toI18n(s, lang);
  }

  async createCustom(data: {
    nameI18n: any;          // accepted as object from client
    descI18n?: any;
    tempMin: number;
    tempMax: number;
    phMin: number;
    phMax: number;
    growthDays: number;
    feedFreq: string;
    stages?: any;
    color?: string;
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
    if (data.tempMin >= data.tempMax)
      throw new BadRequestException('最低温度必须小于最高温度');
    if (data.phMin >= data.phMax)
      throw new BadRequestException('最低pH必须小于最高pH');
    if (data.growthDays <= 0)
      throw new BadRequestException('生长天数必须大于0');

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
        isDefault: false,
      },
    });
  }

  toI18n(s: FishSpecies, lang: string) {
    let nameI18n: Record<string, string> = {};
    let descI18n: Record<string, string> = {};
    let stages: any[] = [];
    try { nameI18n = JSON.parse(s.nameI18n); } catch {}
    try { descI18n = JSON.parse(s.descI18n); } catch {}
    try { stages = JSON.parse(s.stages); } catch {}
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
      feedRefuseHint: (s as any).feedRefuseHint,
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

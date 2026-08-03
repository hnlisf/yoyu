import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// P2 PR 11 新增 — i18n helper
import { safeParse } from '../common/i18n';

export interface UserPreferenceDto {
  userId: string;
  city?: string;
  lat?: number;
  lng?: number;
  favorites?: string[]; // v10.1.3-w4 §3
}

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private prisma: PrismaService) {}

  async get(userId: string) {
    const found = await this.prisma.userPreference.findUnique({ where: { userId } });
    // w4 fix: return sensible default instead of null when user has no prefs row yet
    if (!found) {
      return { userId, city: 'changsha', lat: null, lng: null, favorites: '[]' };
    }
    return found;
  }

  async upsert(dto: UserPreferenceDto) {
    const { userId, city, lat, lng, favorites } = dto;
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        city: city ?? null,
        lat: lat ?? null,
        lng: lng ?? null,
        favorites: favorites ? JSON.stringify(favorites) : '[]',
      },
      update: {
        city: city ?? undefined,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        ...(favorites !== undefined ? { favorites: JSON.stringify(favorites) } : {}),
      },
    });
  }

  // v10.1.3-w4 §3: favorite/unfavorite a species
  async getFavorites(userId: string): Promise<string[]> {
    const prefs = await this.get(userId);
    if (!prefs?.favorites) return [];
    // P2 PR 11: 用 safeParse 替换裸 JSON.parse
    return safeParse<string[]>(prefs.favorites, []);
  }

  async addFavorite(userId: string, speciesId: string): Promise<string[]> {
    const current = await this.getFavorites(userId);
    if (current.includes(speciesId)) return current;
    const next = [...current, speciesId];
    await this.upsert({ userId, favorites: next });
    return next;
  }

  async removeFavorite(userId: string, speciesId: string): Promise<string[]> {
    const current = await this.getFavorites(userId);
    const next = current.filter((id) => id !== speciesId);
    await this.upsert({ userId, favorites: next });
    return next;
  }
}

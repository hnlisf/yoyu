import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserPreferenceDto {
  userId: string;
  city?: string;
  lat?: number;
  lng?: number;
}

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private prisma: PrismaService) {}

  async get(userId: string) {
    return this.prisma.userPreference.findUnique({ where: { userId } });
  }

  async upsert(dto: UserPreferenceDto) {
    const { userId, city, lat, lng } = dto;
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, city: city ?? null, lat: lat ?? null, lng: lng ?? null },
      update: { city: city ?? undefined, lat: lat ?? undefined, lng: lng ?? undefined },
    });
  }
}

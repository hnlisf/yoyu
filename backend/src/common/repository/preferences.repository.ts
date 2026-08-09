/**
 * 文件名：common/repository/preferences.repository.ts
 *
 * PreferencesRepository — 把所有 userPreference 表的访问封装在这里
 * Service 层只通过本类操作 UserPreference 表，不直接 prisma.userPreference
 *
 * P3 PR 14：迁移 PreferencesService 到此 repository
 */

import { Injectable } from '@nestjs/common';
import { UserPreference } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PreferencesRepository extends BaseRepository<UserPreference, { userId: string }> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.userPreference);
  }

  /**
   * 查用户偏好，返回 null
   * Service 层做"未设偏好 → 返回默认"逻辑
   */
  async findByUser(userId: string): Promise<UserPreference | null> {
    return this.findUnique({ userId });
  }
}

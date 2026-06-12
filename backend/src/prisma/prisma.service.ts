import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return 'file:./prisma/dev.db';
  if (!raw.startsWith('file:')) return raw;
  const filePath = raw.replace(/^file:/, '');
  if (path.isAbsolute(filePath)) return raw;
  // Resolve relative to project root (where nest-cli.json / package.json lives)
  return `file:${path.resolve(process.cwd(), filePath)}`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ datasourceUrl: resolveDatabaseUrl() });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

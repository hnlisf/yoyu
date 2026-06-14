import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return 'file:./prisma/dev.db';
  if (!raw.startsWith('file:')) return raw;
  const filePath = raw.replace(/^file:/, '');
  if (path.isAbsolute(filePath)) return raw;
  // Resolve relative to prisma/schema.prisma's directory (matches Prisma CLI's
  // resolution rule). Without this, CLI and runtime end up writing to different
  // files (CLI -> backend/prisma/dev.db, runtime -> backend/dev.db) and the
  // backend sees an empty database.
  const schemaDir = path.resolve(process.cwd(), 'prisma');
  return `file:${path.resolve(schemaDir, filePath)}`;
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

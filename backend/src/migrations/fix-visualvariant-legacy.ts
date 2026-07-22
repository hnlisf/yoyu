#!/usr/bin/env -S node --import tsx
/**
 * One-off, idempotent migration for BUG-V10.1.4-3.
 * golden -> yellow, striped -> stripe, round -> disc.
 *
 * Usage (from backend/):
 *   npm run migrate:visualvariant
 *   DRY_RUN=1 npm run migrate:visualvariant
 * DATABASE_URL may point to a SQLite fixture or deployment database.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const LEGACY = {
  color: { golden: 'yellow' },
  pattern: { striped: 'stripe' },
  body: { round: 'disc' },
} as const;

type Dimension = keyof typeof LEGACY;
const DIMENSIONS: Dimension[] = ['color', 'pattern', 'body'];

function sqlitePath(): string | null {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  if (!url.startsWith('file:')) return null;
  const raw = url.slice('file:'.length);
  return isAbsolute(raw) ? raw : resolve(process.cwd(), 'prisma', raw.replace(/^\.\//, ''));
}

async function main(): Promise<void> {
  const dryRun = process.env.DRY_RUN === '1';
  const dbPath = sqlitePath();
  if (dbPath && !existsSync(dbPath)) throw new Error(`DB file does not exist: ${dbPath}`);
  if (dbPath && !dryRun) {
    const backup = `${dbPath}.before-visualvariant-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
    copyFileSync(dbPath, backup);
    console.log(`backup\t${backup}`);
  }

  const prisma = new PrismaClient();
  let scanned = 0;
  let migrated = 0;
  let skippedInvalid = 0;
  const counts = new Map<string, number>();

  try {
    const rows = await prisma.fishSpecies.findMany({
      where: { visualVariant: { not: null } },
      select: { id: true, visualVariant: true },
    });
    scanned = rows.length;

    for (const row of rows) {
      let value: Record<string, unknown>;
      try {
        value = JSON.parse(row.visualVariant!);
      } catch {
        console.warn(`skip-invalid-json\t${row.id}`);
        skippedInvalid++;
        continue;
      }

      let changed = false;
      for (const dim of DIMENSIONS) {
        const oldValue = value[dim];
        if (typeof oldValue !== 'string') continue;
        const newValue = LEGACY[dim][oldValue as keyof (typeof LEGACY)[typeof dim]] as string | undefined;
        if (!newValue) continue;
        value[dim] = newValue;
        counts.set(`${dim}\t${oldValue}\t${newValue}`, (counts.get(`${dim}\t${oldValue}\t${newValue}`) || 0) + 1);
        changed = true;
      }

      if (!changed) continue;
      migrated++;
      if (!dryRun) {
        await prisma.fishSpecies.update({
          where: { id: row.id },
          data: { visualVariant: JSON.stringify(value) },
        });
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('dimension\tfrom\tto\tcount');
  for (const [key, count] of counts) console.log(`${key}\t${count}`);
  console.log(`summary\tscanned=${scanned}\tmigrated=${migrated}\tinvalid=${skippedInvalid}\tdryRun=${dryRun}`);
}

main().catch((error) => {
  console.error(`[fix-visualvariant-legacy] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

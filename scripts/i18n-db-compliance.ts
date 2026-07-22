#!/usr/bin/env -S node --import tsx
/**
 * SOP-03 D1.2.2: validate fish_species.visual_variant values against v10 ALLOWED_VV.
 *
 * Usage (from backend/): npm run test:i18n:db
 * Optional DB override: DATABASE_URL=file:/absolute/path/to/dev.db
 * Exit: 0 compliant, 1 violations, 2 execution/configuration error.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { cwd } from 'node:process';

const BACKEND_DIR = cwd();
const REPO_ROOT = resolve(BACKEND_DIR, '..');
const SERVICE_FILE = resolve(BACKEND_DIR, 'src/fish-species/fish-species.service.ts');

type Dimension = 'color' | 'pattern' | 'body';
type Allowed = Record<Dimension, string[]>;
const DIMENSIONS: Dimension[] = ['color', 'pattern', 'body'];
const SUGGESTIONS: Record<Dimension, Record<string, string>> = {
  color: { golden: 'yellow' },
  pattern: { striped: 'stripe' },
  body: { round: 'disc' },
};
const EXPECTED_ALLOWED: Allowed = {
  color: ['red', 'orange', 'yellow', 'green', 'blue'],
  pattern: ['solid', 'stripe', 'spots', 'gradient', 'camouflage'],
  body: ['oval', 'diamond', 'streamlined', 'disc', 'elongated'],
};

function extractAllowed(): Allowed {
  const source = readFileSync(SERVICE_FILE, 'utf8');
  const marker = source.indexOf('const ALLOWED_VV =');
  if (marker < 0) throw new Error(`ALLOWED_VV not found: ${SERVICE_FILE}`);
  const block = source.slice(marker, marker + 1000);
  const result = {} as Allowed;
  for (const dim of DIMENSIONS) {
    const match = block.match(new RegExp(`${dim}\\s*:\\s*\\[([^\\]]+)\\]`));
    if (!match) throw new Error(`ALLOWED_VV.${dim} not parseable: ${SERVICE_FILE}`);
    result[dim] = [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
    if (result[dim].length === 0) throw new Error(`ALLOWED_VV.${dim} is empty`);
  }
  return result;
}

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  if (!url.startsWith('file:')) {
    throw new Error(`Only SQLite file: DATABASE_URL is supported in CI, got ${url.split(':')[0]}:`);
  }
  const raw = url.slice('file:'.length);
  if (!raw) throw new Error('DATABASE_URL has an empty file path');
  return isAbsolute(raw) ? raw : resolve(BACKEND_DIR, 'prisma', raw.replace(/^\.\//, ''));
}

function quoteSql(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function query(dbPath: string, sql: string): string[][] {
  const out = execFileSync('sqlite3', ['-batch', '-separator', '\t', dbPath, sql], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  return out ? out.split('\n').map((line) => line.split('\t')) : [];
}

function main(): void {
  const allowed = extractAllowed();
  for (const dim of DIMENSIONS) {
    if (JSON.stringify(allowed[dim]) !== JSON.stringify(EXPECTED_ALLOWED[dim])) {
      throw new Error(`ALLOWED_VV.${dim} changed; update the D1.2.2 expected set and migration review`);
    }
  }
  const dbPath = resolveDbPath();
  if (!existsSync(dbPath)) throw new Error(`DB file does not exist: ${dbPath}`);

  const table = query(dbPath, "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='fish_species';");
  if (table[0]?.[0] !== '1') throw new Error(`fish_species table does not exist: ${dbPath}`);

  let violations = 0;
  console.log('dimension\tvalue\tcount\tsuggestion\tstatus');
  const malformed = query(
    dbPath,
    "SELECT '<malformed-json>', COUNT(*) FROM fish_species WHERE visual_variant IS NOT NULL AND json_valid(visual_variant)=0;",
  );
  if (Number(malformed[0]?.[1] || 0) > 0) {
    console.log(`record\t<malformed-json>\t${malformed[0][1]}\trepair valid JSON\tFAIL`);
    violations++;
  }

  for (const dim of DIMENSIONS) {
    const inList = allowed[dim].map(quoteSql).join(',');
    const missing = query(
      dbPath,
      `SELECT '<missing>', COUNT(*) FROM fish_species WHERE visual_variant IS NOT NULL AND json_valid(visual_variant)=1 AND (json_type(visual_variant, '$.${dim}') IS NULL OR json_type(visual_variant, '$.${dim}') <> 'text' OR trim(json_extract(visual_variant, '$.${dim}'))='');`,
    );
    if (Number(missing[0]?.[1] || 0) > 0) {
      console.log(`${dim}\t<missing-or-non-string>\t${missing[0][1]}\tpopulate an ALLOWED_VV.${dim} value\tFAIL`);
      violations++;
    }

    const rows = query(
      dbPath,
      `SELECT json_extract(visual_variant, '$.${dim}'), COUNT(*) FROM fish_species WHERE visual_variant IS NOT NULL AND json_valid(visual_variant)=1 AND json_type(visual_variant, '$.${dim}')='text' AND json_extract(visual_variant, '$.${dim}') NOT IN (${inList}) GROUP BY 1 ORDER BY 1;`,
    );
    for (const [value, count] of rows) {
      const mapped = SUGGESTIONS[dim][value];
      const suggestion = mapped ? `${value}->${mapped}` : 'manual migration required';
      console.log(`${dim}\t${value}\t${count}\t${suggestion}\tFAIL`);
      violations++;
    }
  }

  if (violations > 0) {
    console.error(`D1.2.2 FAIL: ${violations} violation group(s)`);
    process.exitCode = 1;
  } else {
    console.log('summary\t-\t0\t-\tPASS');
    console.log('D1.2.2 PASS: DB visualVariant values are 100% compliant');
  }
}

try {
  main();
} catch (error) {
  console.error(`[i18n-db-compliance] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
}

#!/usr/bin/env -S npx tsx
/**
 * ============================================================================
 * 文件名：env-schema-check.ts（环境变量校验检查器）
 * ============================================================================
 * 作用：强制进程启动时用 zod/envalid 校验 process.env，杜绝"裸读 + ??兜底"模式
 *
 * 检查项（来自 harness.yaml universal_baseline.data_integrity.env_schema_validation）：
 *   1. backend/src/main.ts 必须 import zod 或 envalid
 *   2. 关键文件（main.ts / app.module.ts / config.module.ts）中
 *      process.env.X 直接读取（无 fallback schema）应被 envSchema.parse(env) 替代
 *
 * 为什么重要：
 *   当前代码用 `process.env.PORT ?? '3000'` 兜底 → 启动时无法发现拼错的 env 变量
 *   生产环境会因为 typo 静默使用错误配置
 *
 * PR 1: 报告现状（预期 backend/src 全是裸读模式）
 * PR 5+: 阻断新增裸读，强制 envSchema.parse(process.env)
 * ============================================================================
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..');
const BACKEND_SRC = resolve(REPO_ROOT, 'backend/src');

interface Finding {
  file: string;
  line: number;
  rule: string;
  message: string;
}

function* walkTs(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      yield* walkTs(full);
    } else if (entry.endsWith('.ts')) {
      yield full;
    }
  }
}

function checkMainFile(): { hasSchema: boolean; findings: Finding[] } {
  const mainPath = resolve(BACKEND_SRC, 'main.ts');
  if (!existsSync(mainPath)) return { hasSchema: false, findings: [] };

  const content = readFileSync(mainPath, 'utf8');
  const hasSchema = /from\s+['"]zod['"]/.test(content) || /from\s+['"]envalid['"]/.test(content);
  return { hasSchema, findings: [] };
}

function findDirectEnvReads(): Finding[] {
  const findings: Finding[] = [];
  // 允许列表：在 envSchema 校验后读取通常带有 schema 上下文，简单 grep 容易误报
  // 仅标记 main.ts / app.module.ts 中"启动前"的读取
  const criticalFiles = ['main.ts', 'app.module.ts', 'config.module.ts'];

  for (const f of criticalFiles) {
    const full = resolve(BACKEND_SRC, f);
    if (!existsSync(full)) continue;
    const lines = readFileSync(full, 'utf8').split(/\r?\n/);
    lines.forEach((content, idx) => {
      if (/process\.env\.\w+/.test(content) && !/^(\s*\/\/|\s*\/\*)/.test(content)) {
        findings.push({
          file: `backend/src/${f}`,
          line: idx + 1,
          rule: 'data_integrity.env_schema_validation.direct_read',
          message: `直接读取 ${content.match(/process\.env\.\w+/)?.[0]} — 应用 zod/envalid schema 校验`,
        });
      }
    });
  }
  return findings;
}

function main() {
  const { hasSchema } = checkMainFile();
  const findings = findDirectEnvReads();

  console.log(`\n🔍 env-schema-check — zod/envalid 导入: ${hasSchema ? '✅' : '❌'}`);
  console.log(`   ${findings.length} 处 process.env 直接读取需校验`);

  if (findings.length === 0) {
    console.log('   ✅ 无直接 process.env 读取');
    process.exit(0);
  }

  for (const f of findings) {
    console.log(`   ${f.file}:${f.line}  ${f.message}`);
  }

  console.log(`\n   ⚠️  建议在 P0 PR 5 加 zod 校验：envSchema = z.object({...}); configService = envSchema.parse(process.env);`);
  process.exit(0);
}

main();
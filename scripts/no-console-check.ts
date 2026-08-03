#!/usr/bin/env -S npx tsx
/**
 * ============================================================================
 * 文件名：no-console-check.ts（结构化日志强制检查器）
 * ============================================================================
 * 作用：禁用 console.log/info/warn，强制使用 pino/winston 结构化日志
 *
 * 检查项（来自 harness.yaml universal_baseline.observability.structured_logging）：
 *   backend/src/** 和 frontend/src/** 中的 console.log / console.info / console.warn
 *   （console.error 允许 — 用于顶层异常捕获，未带堆栈会丢失上下文）
 *
 * 为什么重要：
 *   console.log 输出无结构、无级别、无时间戳 → 故障排查靠肉眼翻日志
 *   pino/winston 输出 JSON → 可被 ELK/Loki 直接索引
 *
 * 当前违规：8 处（backend/src/main.ts 2 + migrations 5 + frontend/lib/api.ts 1）
 *
 * PR 1: 报告现状
 * PR 5+: 阻断新增，引入 pino 后开始统一替换
 * ============================================================================
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..');

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
      if (entry === 'node_modules' || entry === 'dist' || entry === '.next') continue;
      yield* walkTs(full);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      yield full;
    }
  }
}

const FORBIDDEN_PATTERNS = [
  { re: /console\.log\s*\(/, rule: 'console.log' },
  { re: /console\.info\s*\(/, rule: 'console.info' },
  { re: /console\.warn\s*\(/, rule: 'console.warn' },
  // console.error 允许（顶层异常捕获）
];

function checkNoConsole(): Finding[] {
  const findings: Finding[] = [];
  const dirs = ['backend/src', 'frontend/src'];

  for (const dir of dirs) {
    const root = resolve(REPO_ROOT, dir);
    if (!existsSync(root)) continue;
    for (const file of walkTs(root)) {
      const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);

      lines.forEach((content, idx) => {
        // 跳过注释行
        if (/^\s*(\/\/|\*|\/\*)/.test(content)) return;
        for (const { re, rule } of FORBIDDEN_PATTERNS) {
          if (re.test(content)) {
            findings.push({
              file: rel,
              line: idx + 1,
              rule: `observability.no_console.${rule}`,
              message: `禁用 ${rule} — 应用 pino.logger.${rule.replace('console.', '')}() 或 winston`,
            });
          }
        }
      });
    }
  }
  return findings;
}

function main() {
  const findings = checkNoConsole();
  console.log(`\n🔍 no-console-check — ${findings.length} 处禁用 console 调用`);

  if (findings.length === 0) {
    console.log('   ✅ 无违规');
    process.exit(0);
  }

  const byFile = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  for (const [file, items] of byFile) {
    console.log(`\n   📌 ${file} (${items.length})`);
    for (const it of items.slice(0, 5)) {
      console.log(`      L${it.line}: ${it.message}`);
    }
    if (items.length > 5) console.log(`      ... and ${items.length - 5} more`);
  }

  console.log(`\n   ⚠️  PR 5+ 引入 pino 后开始阻断`);
  process.exit(0);
}

main();
#!/usr/bin/env -S npx tsx
/**
 * ============================================================================
 * 文件名：jsonb-strict-check.ts（JSON.parse 静默吞错检测器）
 * ============================================================================
 * 作用：检测 backend/src/** 中 JSON.parse 周围的静默 try/catch 块
 *
 * 检查项（来自 harness.yaml universal_baseline.data_integrity.jsonb_strict_parse）：
 *   禁止 `try { JSON.parse(...) } catch (e) {}` 模式
 *   parse 失败必须：logger.warn(payload) + 返回 fallback 或抛错
 *   静默吞掉 → 坏数据悄无声息，排查灾难
 *
 * 当前违规：13 处（与 ref-check.ts JSON.parse 热点重合）
 *
 * 工作原理（3 段）：
 *   - walkTs()             递归找所有 .ts（排除 .spec.ts）
 *   - findSilentCatches()  对每行滑动窗口（前后 5 行）匹配 JSON.parse 上下文
 *                          若上下文含空 catch 或仅注释的 catch → 违规
 *
 * PR 1: 报告已知 13 处（已记入 harness.yaml + KNOWN_PITFALLS §JSONB 抽象）
 * PR 2+: 由 P2 PR 11 用 src/common/i18n.ts safeParse 替换后会全部清零
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
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
      yield full;
    }
  }
}

const SILENT_PATTERNS = [
  /catch\s*\([^)]*\)\s*\{\s*\}/,                  // catch (e) {}
  /catch\s*\([^)]*\)\s*\{\s*\/\*[^*]*\*\/\s*\}/, // catch (e) { /* comment */ }
];

function findSilentCatches(content: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const windowStart = Math.max(0, i - 5);
    const window = lines.slice(windowStart, i + 2).join('\n');

    if (!window.includes('JSON.parse')) continue;

    for (const pat of SILENT_PATTERNS) {
      if (pat.test(window)) {
        findings.push({
          file: relative(REPO_ROOT, file).replace(/\\/g, '/'),
          line: i + 1,
          rule: 'data_integrity.jsonb_strict_parse.silent_catch',
          message: 'JSON.parse 周围有静默 catch — 应至少 logger.warn() + 返回 fallback 或抛错',
        });
        break;
      }
    }
  }
  return findings;
}

function main() {
  const files = [...walkTs(BACKEND_SRC)];
  const findings: Finding[] = [];
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    findings.push(...findSilentCatches(content, f));
  }

  console.log(`\n🔍 jsonb-strict-check — ${findings.length} 静默 catch（JSON.parse 周围）`);

  if (findings.length === 0) {
    console.log('   ✅ 无静默吞 JSON.parse 错误');
    process.exit(0);
  }

  // 按文件分组
  const byFile = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  for (const [file, items] of byFile) {
    console.log(`\n   📌 ${file} (${items.length})`);
    for (const it of items) {
      console.log(`      L${it.line}: ${it.message}`);
    }
  }

  // ── P2 PR 11 完成：从 baseline-aware 升级为硬阻断 ──
  // 当前 0 findings；新违例 → exit 1
  console.log(`\n   ⚠️  PR 11 (P2 §1) 已完成 — 新静默 catch 会阻断`);
  process.exit(findings.length > 0 ? 1 : 0);
}

main();
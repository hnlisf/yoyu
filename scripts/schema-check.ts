#!/usr/bin/env -S npx tsx
/**
 * ============================================================================
 * 文件名：schema-check.ts（Prisma schema 静态检查器）
 * ============================================================================
 * 作用：扫描 backend/prisma/schema.prisma，检测 2 类反模式
 *
 * 检查项（来自 harness.yaml project_policies.prisma）：
 *   1. forbid_version_comments
 *      禁 // v9.0 / // v9.1 item1 / // v10.x 注释（应入 CHANGELOG.md）
 *      当前发现 14 处
 *   2. forbid_dual_columns
 *      禁 FishTank.temp 与 FishTank.temperature 同时存在
 *      （两个温度字段导致 temperature-adjust 和 water-temperature 模块竞争写入）
 *
 * 工作原理（3 段）：
 *   - loadPolicy()           读 harness.yaml policies.prisma
 *   - checkVersionComments() 正则匹配 // v\d+(\.\d+)*(\s+item\d+)?
 *   - checkDualColumns()     扫描 model { ... } 块，收集列名，检查 forbid_dual_columns
 *
 * PR 1: baseline-aware — 报告已知违规，不阻断（exit 0）
 * PR 2+: 由 orchestrator 决定是否阻断
 * ============================================================================
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import * as YAML from 'yaml';

const REPO_ROOT = resolve(__dirname, '..');
const HARNESS_PATH = resolve(REPO_ROOT, 'harness.yaml');
const SCHEMA_PATH = resolve(REPO_ROOT, 'backend/prisma/schema.prisma');

interface PrismaPolicy {
  forbid_version_comments: boolean;
  forbid_dual_columns: string[];
}

interface Finding {
  file: string;
  line: number;
  rule: string;
  message: string;
}

function loadPolicy(): PrismaPolicy {
  const cfg = YAML.parse(readFileSync(HARNESS_PATH, 'utf8'));
  return cfg.policies.prisma as PrismaPolicy;
}

function checkVersionComments(policy: PrismaPolicy): Finding[] {
  if (!policy.forbid_version_comments) return [];
  const findings: Finding[] = [];
  const lines = readFileSync(SCHEMA_PATH, 'utf8').split(/\r?\n/);
  const re = /\/\/\s*v\d+(\.\d+)*(\s+item\d+)?/; // 匹配 // v9.0 / // v10.1.4 item1

  lines.forEach((content, idx) => {
    const m = content.match(re);
    if (m) {
      findings.push({
        file: relative(REPO_ROOT, SCHEMA_PATH).replace(/\\/g, '/'),
        line: idx + 1,
        rule: 'prisma.forbid_version_comments',
        message: `版本注释 "${m[0]}" — 应入 CHANGELOG.md，schema 注释只能解释"为什么"`,
      });
    }
  });
  return findings;
}

function checkDualColumns(policy: PrismaPolicy): Finding[] {
  const findings: Finding[] = [];
  const lines = readFileSync(SCHEMA_PATH, 'utf8').split(/\r?\n/);

  // 找每个 model 的列定义
  let currentModel: string | null = null;
  const columnsByModel = new Map<string, string[]>();

  lines.forEach((content, idx) => {
    const modelMatch = content.match(/^model\s+(\w+)/);
    if (modelMatch) {
      currentModel = modelMatch[1];
      columnsByModel.set(currentModel, []);
      return;
    }
    if (currentModel && /^\s+\w+\s+\w+/.test(content)) {
      const colMatch = content.match(/^\s+(\w+)\s+/);
      if (colMatch) {
        columnsByModel.get(currentModel)!.push(`${colMatch[1]}:${idx + 1}`);
      }
    }
    if (currentModel && /^}/.test(content)) {
      currentModel = null;
    }
  });

  // 检查 forbidden 双重列
  for (const forbidden of policy.forbid_dual_columns) {
    const [modelName, ...cols] = forbidden.split('.');
    if (cols.length < 2) continue;
    const modelCols = columnsByModel.get(modelName) || [];
    const present = cols.filter((c) => modelCols.some((mc) => mc.startsWith(c + ':')));
    if (present.length >= 2) {
      findings.push({
        file: relative(REPO_ROOT, SCHEMA_PATH).replace(/\\/g, '/'),
        line: 0,
        rule: `prisma.forbid_dual_columns.${modelName}`,
        message: `${modelName} 表同时存在 ${present.join(' + ')} — 应合并为单一字段`,
      });
    }
  }
  return findings;
}

function main() {
  if (!existsSync(SCHEMA_PATH)) {
    console.error(`❌ schema.prisma not found at ${SCHEMA_PATH}`);
    process.exit(2);
  }
  const policy = loadPolicy();
  const findings = [...checkVersionComments(policy), ...checkDualColumns(policy)];

  console.log(`\n🔍 schema-check — ${findings.length} findings`);

  if (findings.length === 0) {
    console.log('   ✅ schema.prisma 无违规');
    process.exit(0);
  }

  for (const f of findings) {
    console.log(`   ${f.file}:${f.line || '?'}  [${f.rule}]  ${f.message}`);
  }

  // ── P2 PR 12：从 baseline-aware 升级为硬阻断 ──
  // 当前 0 findings；新违例 → exit 1
  process.exit(findings.length > 0 ? 1 : 0);
}

main();
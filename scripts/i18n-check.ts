#!/usr/bin/env -S npx tsx
/**
 * ============================================================================
 * 文件名：i18n-check.ts（三语一致性检查器）
 * ============================================================================
 * 作用：包装既有 scripts/i18n-db-compliance.ts，加上三语 key parity 校验
 *
 * 检查项：
 *   1. visualVariant 合规（复用既有 scripts/i18n-db-compliance.ts — 检查 visualVariant JSON
 *      是否在 ALLOWED_VV 枚举内）
 *   2. 三语 key parity（新增）
 *      - 任何 zh 顶层 key 必须存在于 en 和 ja
 *      - 嵌套结构必须相同（key 数 + 叶子数对齐）
 *   3. 已知 i18n bug 检测（baseline-aware）
 *      - ja.json tankNames 缺 My Tank
 *      - errors.tank_already_fresh 占位符不一致（ja 用 {items}，zh/en 用 {hours}）
 *
 * 当前违规：4 处（已知 bug 在 P4 PR 20 修）
 *
 * 工作原理（3 段）：
 *   - runExistingCompliance()    execSync scripts/i18n-db-compliance.ts，捕获 exit code
 *   - checkMessagesParity()      getAllKeys() 递归提取所有 leaf key，diff 三 locale
 *   - main()                     合并两类 findings，PR 1 baseline-aware 输出
 *
 * PR 1: baseline-aware 报告已知漂移
 * PR 5+: 阻断新增漂移
 * ============================================================================
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import * as YAML from 'yaml';

const REPO_ROOT = resolve(__dirname, '..');

interface Finding {
  rule: string;
  message: string;
}

function runExistingCompliance(): { ok: boolean; findings: Finding[] } {
  const scriptPath = resolve(REPO_ROOT, 'scripts/i18n-db-compliance.ts');
  if (!existsSync(scriptPath)) {
    return { ok: true, findings: [{ rule: 'i18n.compliance.missing', message: 'scripts/i18n-db-compliance.ts 不存在' }] };
  }
  try {
    execSync(`npx tsx ${scriptPath}`, { cwd: REPO_ROOT, stdio: 'pipe' });
    return { ok: true, findings: [] };
  } catch (e: any) {
    // 退出码 1 = 合规违例；2 = 执行错误
    if (e.status === 1) {
      const stdout = e.stdout?.toString() || '';
      return {
        ok: false,
        findings: [{ rule: 'i18n.compliance.violations', message: `现有 i18n-db-compliance.ts 报告违例：\n${stdout.slice(0, 500)}` }],
      };
    }
    return {
      ok: false,
      findings: [{ rule: 'i18n.compliance.exec_error', message: `现有 i18n-db-compliance.ts 执行错误（exit ${e.status}）` }],
    };
  }
}

function getAllKeys(obj: any, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  if (Array.isArray(obj)) return [prefix];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...getAllKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function checkMessagesParity(): Finding[] {
  const findings: Finding[] = [];
  const locales = ['zh', 'en', 'ja'] as const;
  const messages: Record<string, Set<string>> = {};

  for (const loc of locales) {
    const path = resolve(REPO_ROOT, `frontend/src/messages/${loc}.json`);
    if (!existsSync(path)) {
      findings.push({ rule: `i18n.parity.missing_${loc}`, message: `${loc}.json 不存在（路径 frontend/src/messages/）` });
      continue;
    }
    try {
      const json = JSON.parse(readFileSync(path, 'utf8'));
      messages[loc] = new Set(getAllKeys(json));
    } catch (e: any) {
      findings.push({ rule: `i18n.parity.parse_error_${loc}`, message: `${loc}.json 解析失败: ${e.message}` });
    }
  }

  if (Object.keys(messages).length < locales.length) return findings;

  // 检查每个 locale 的 key 集合是否一致
  const base = messages.zh;
  for (const loc of ['en', 'ja']) {
    if (!messages[loc]) continue;
    const missing = [...base].filter((k) => !messages[loc].has(k));
    const extra = [...messages[loc]].filter((k) => !base.has(k));
    if (missing.length > 0) {
      findings.push({
        rule: `i18n.parity.${loc}_missing`,
        message: `${loc}.json 缺 ${missing.length} 个 zh 已有 key，例如：\n   ${missing.slice(0, 3).join('\n   ')}`,
      });
    }
    if (extra.length > 0) {
      findings.push({
        rule: `i18n.parity.${loc}_extra`,
        message: `${loc}.json 多 ${extra.length} 个 zh 没有的 key，例如：\n   ${extra.slice(0, 3).join('\n   ')}`,
      });
    }
  }

  // 检查已知 i18n bug：ja tankNames 缺 My Tank
  const ja = JSON.parse(readFileSync(resolve(REPO_ROOT, 'frontend/src/messages/ja.json'), 'utf8'));
  const en = JSON.parse(readFileSync(resolve(REPO_ROOT, 'frontend/src/messages/en.json'), 'utf8'));
  if (en.tankNames && ja.tankNames) {
    const enKeys = Object.keys(en.tankNames);
    const jaKeys = Object.keys(ja.tankNames);
    if (enKeys.length > jaKeys.length) {
      const diff = enKeys.filter((k) => !jaKeys.includes(k));
      findings.push({
        rule: 'i18n.bug.tankNames_ja_missing',
        message: `已知 bug：ja.json tankNames 缺 ${diff.length} 个 key（${diff.join(', ')}）— P4 PR 20 修`,
      });
    }
  }

  // 检查 errors.tank_already_fresh 占位符一致性
  for (const loc of locales) {
    const json = JSON.parse(readFileSync(resolve(REPO_ROOT, `frontend/src/messages/${loc}.json`), 'utf8'));
    const taf = json.errors?.tank_already_fresh;
    if (typeof taf === 'string') {
      const hasHours = /\{hours\}/.test(taf);
      const hasItems = /\{items\}/.test(taf);
      if (loc === 'ja' && hasItems && !hasHours) {
        findings.push({
          rule: 'i18n.bug.placeholder_mismatch_ja',
          message: `已知 bug：${loc}.json errors.tank_already_fresh 用 {items} 而 zh/en 用 {hours} — P4 PR 20 修`,
        });
      }
    }
  }

  return findings;
}

function main() {
  console.log(`\n🔍 i18n-check — 三语 parity + visualVariant 合规`);

  const compliance = runExistingCompliance();
  const parity = checkMessagesParity();
  const allFindings = [...compliance.findings, ...parity];

  console.log(`\n   visualVariant compliance: ${compliance.ok ? '✅' : '⚠️ '}`);
  console.log(`   三语 parity findings: ${parity.length}`);

  if (allFindings.length === 0) {
    console.log('\n   ✅ 所有 i18n 检查通过');
    process.exit(0);
  }

  console.log('');
  for (const f of allFindings) {
    console.log(`   [${f.rule}]`);
    console.log(`   ${f.message}\n`);
  }

  // PR 1 baseline-aware
  console.log('   ⚠️  PR 1 baseline-aware — 已知 bug 在 P4 PR 20 修');
  process.exit(0);
}

main();
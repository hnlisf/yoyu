#!/usr/bin/env node
/**
 * ============================================================================
 * 文件名：harness.ts（Harness 编排器）
 * ============================================================================
 * 作用：读取 harness.yaml，按 gate 类型决定跑哪些子脚本，并聚合退出码
 *
 * 用法（在仓库根目录）：
 *   npx tsx scripts/harness.ts check          # 等价于 check:full
 *   npx tsx scripts/harness.ts check:fast     # 跑 fast subset（3 个）
 *   npx tsx scripts/harness.ts check:full     # 跑 fast + test（共 5+ 个）
 *   npx tsx scripts/harness.ts report         # 跑所有脚本并打印报告（不阻断）
 *
 * 工作原理（5 步）：
 *   1. 读 harness.yaml → 拿到 scripts 映射表 + pr1_status.blocking_in_pr1 标志
 *   2. 根据 mode 选择要跑的脚本列表（harness:check:fast / :full / 全套）
 *   3. 依次 execSync 每个脚本，检查文件是否存在（不存在则标记 skipped）
 *   4. 统计 ok / failed / skipped 数量
 *   5. 如果有 failed 且 blocking=true → exit 1（CI 红灯）；否则 exit 0
 *
 * 学习要点：
 *   - 这是 "YAML 驱动 TS 脚本" 的典型模式 — 配置与逻辑分离
 *   - baseline-aware 设计：PR 1 阶段所有失败都 "non-blocking"，方便先收集问题
 *   - PR 2 时把 harness.yaml 里 pr1_status.blocking_in_pr1 翻成 true，即变硬阻断
 *
 * PR 1 状态: blocking_in_pr1=false，所有子脚本失败时主进程 exit 0（仅打印报告）
 * PR 2 状态: blocking_in_pr1=true，子脚本失败时主进程 exit 1（CI 红灯）
 * ============================================================================
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import * as YAML from 'yaml';

const REPO_ROOT = resolve(__dirname, '..');
const HARNESS_PATH = resolve(REPO_ROOT, 'harness.yaml');

interface HarnessConfig {
  scripts: Record<string, string[] | string>;
  pr1_status?: { blocking_in_pr1: boolean };
}

function loadHarness(): HarnessConfig {
  if (!existsSync(HARNESS_PATH)) {
    console.error(`❌ harness.yaml not found at ${HARNESS_PATH}`);
    process.exit(2);
  }
  const raw = readFileSync(HARNESS_PATH, 'utf8');
  return YAML.parse(raw);
}

function runScript(scriptKey: string, scripts: Record<string, string | string[]>): { status: 'ok' | 'failed' | 'skipped'; cmd: string } {
  const cmd = scripts[scriptKey];
  if (!cmd) {
    console.warn(`⚠️  Script "${scriptKey}" not defined in harness.yaml`);
    return { status: 'skipped', cmd: '' };
  }
  const fullCmd = Array.isArray(cmd) ? cmd.join(' && ') : cmd;

  // 检查脚本文件是否存在（提取最后一个 .ts/.sh 文件路径）
  const scriptFileMatch = fullCmd.match(/scripts\/[\w.-]+\.(ts|sh)/);
  if (scriptFileMatch) {
    const fs = require('node:fs') as typeof import('node:fs');
    if (!fs.existsSync(resolve(REPO_ROOT, scriptFileMatch[0]))) {
      console.log(`\n━━━ ${scriptKey} ━━━`);
      console.log(`⏭️  SKIPPED — 文件不存在: ${scriptFileMatch[0]}（后续 PR 创建）`);
      return { status: 'skipped', cmd: fullCmd };
    }
  }

  console.log(`\n━━━ ${scriptKey} ━━━`);
  console.log(`$ ${fullCmd}`);
  try {
    execSync(fullCmd, { cwd: REPO_ROOT, stdio: 'inherit', shell: true });
    return { status: 'ok', cmd: fullCmd };
  } catch (e: any) {
    return { status: 'failed', cmd: fullCmd };
  }
}

function main() {
  const mode = process.argv[2] || 'check:full';
  const harness = loadHarness();
  const scripts = harness.scripts as Record<string, string | string[]>;
  // 阻断策略优先级：report 模式永远不阻断；否则查 blocking_in_pr2（PR 2+ 默认 true）；
  // 兼容旧字段 blocking_in_pr1；都没有则默认 true（最严）
  const blocking = mode === 'report'
    ? false
    : (harness.pr1_status?.blocking_in_pr2
       ?? harness.pr1_status?.blocking_in_pr1
       ?? true);

  // 选择要跑的脚本
  let toRun: string[] = [];
  if (mode === 'check:fast') {
    const list = scripts['harness:check:fast'];
    toRun = Array.isArray(list) ? list : [String(list)];
  } else if (mode === 'check:full' || mode === 'check') {
    const list = scripts['harness:check:full'];
    toRun = Array.isArray(list) ? list : [String(list)];
  } else if (mode === 'report') {
    // report 跑所有可用的脚本
    toRun = Object.keys(scripts).filter((k) => !k.startsWith('harness:') && !k.includes(':'));
  } else {
    console.error(`❌ Unknown mode: ${mode}. Use check | check:fast | check:full | report`);
    process.exit(2);
  }

  console.log(`\n🔒 Harness ${mode} — ${toRun.length} checks (blocking=${blocking})`);
  const startTime = Date.now();
  const results: Array<{ key: string; status: 'ok' | 'failed' | 'skipped' }> = [];

  for (const key of toRun) {
    const { status } = runScript(key, scripts);
    results.push({ key, status });
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const passed = results.filter((r) => r.status === 'ok').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  console.log(`\n${'━'.repeat(60)}`);
  console.log(`📊 Harness Report (${elapsed}s)`);
  console.log(`   Mode: ${mode}  Blocking: ${blocking}`);
  console.log(`   ✅ Passed: ${passed}  ❌ Failed: ${failed}  ⏭️  Skipped: ${skipped}`);
  for (const r of results) {
    const icon = r.status === 'ok' ? '✅' : r.status === 'failed' ? '❌' : '⏭️ ';
    console.log(`   ${icon} ${r.key}`);
  }
  console.log('━'.repeat(60));

  if (failed > 0 && blocking) {
    console.error(`\n❌ ${failed} check(s) failed. PR blocked.`);
    process.exit(1);
  } else if (failed > 0) {
    const reason = mode === 'report'
      ? 'report 模式（不强制阻断）'
      : `blocking=false（harness.yaml pr1_status.blocking_in_pr${mode.includes('fast') ? '2' : '2'} 设为 false）`;
    console.warn(`\n⚠️  ${failed} check(s) failed but ${reason}.`);
    process.exit(0);
  } else {
    console.log(`\n✅ All checks passed.`);
    process.exit(0);
  }
}

main();
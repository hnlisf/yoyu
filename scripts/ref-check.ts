#!/usr/bin/env -S npx tsx
/**
 * ============================================================================
 * 文件名：ref-check.ts（代码反模式检测器）
 * ============================================================================
 * 作用：扫描代码，检测 3 类反模式
 *
 * 检查项（来自 harness.yaml project_policies）：
 *   1. JSON.parse 散落 — backend/src/** 中除 src/common/i18n.ts 外的 JSON.parse( 调用
 *      （本项目有 13 个已知热点，记入 harness.yaml → policies.jsonb.known_hotspots）
 *   2. 前端 v3 残留类名 — frontend/** 中 water-* / sand-* / coral-* / badge-* / btn-* / .card / .label
 *      （23 处 v3 样式未替换为 v4 token）
 *   3. 被禁导入 — frontend/** 中 import lib/stores/fishStore / uiStore / lib/api/mock
 *      （2 个死 zustand store + 4 个 mock 端点消费者）
 *
 * 工作原理（3 段结构）：
 *   - loadPolicy()    读 harness.yaml 拿到 policies 段
 *   - walkFiles()     生成器，递归遍历目录，过滤 .ts/.tsx/.css
 *   - checkBackendJsonb() / checkFrontendBannedClasses() / checkFrontendBannedImports()
 *                      三段独立检查，每段返回 Finding[]
 *
 * PR 1: baseline-aware — 报告所有发现但不阻断（exit 0）
 * PR 2+: harness orchestrator 根据 pr1_status.blocking_in_pr1 决定是否阻断
 * ============================================================================
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import * as YAML from 'yaml';

const REPO_ROOT = resolve(__dirname, '..');
const HARNESS_PATH = resolve(REPO_ROOT, 'harness.yaml');

interface Policy {
  jsonb: { forbid_parse_outside_helper: boolean; known_hotspots: string[] };
  frontend: { banned_classes: string[]; banned_imports: string[] };
}

interface Finding {
  file: string;
  line: number;
  rule: string;
  match: string;
  message: string;
}

function loadPolicy(): Policy {
  if (!existsSync(HARNESS_PATH)) {
    console.error(`❌ harness.yaml not found`);
    process.exit(2);
  }
  const cfg = YAML.parse(readFileSync(HARNESS_PATH, 'utf8'));
  return cfg.policies as Policy;
}

function* walkFiles(dir: string, ext: RegExp): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.next' || entry === '.git') continue;
      yield* walkFiles(full, ext);
    } else if (ext.test(entry)) {
      yield full;
    }
  }
}

function checkBackendJsonb(policy: Policy): Finding[] {
  const findings: Finding[] = [];
  const helperPath = 'backend/src/common/i18n.ts'; // P2 PR 10 引入
  const hotspots = new Set(policy.jsonb.known_hotspots || []);

  for (const file of walkFiles(join(REPO_ROOT, 'backend/src'), /\.(ts|tsx)$/)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
    if (rel === helperPath) continue; // 允许在 helper 内 parse

    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((content, idx) => {
      // 跳过注释行
      if (/^\s*(\/\/|\*|\/\*)/.test(content)) return;
      // 匹配 JSON.parse(
      const m = content.match(/JSON\.parse\s*\(/);
      if (m) {
        const loc = `${rel}:${idx + 1}`;
        findings.push({
          file: rel,
          line: idx + 1,
          rule: 'jsonb.forbid_parse_outside_helper',
          match: m[0],
          message: hotspots.has(loc)
            ? `已知 hotspot（${loc}），P2 PR 11 需修`
            : `新增 JSON.parse( 调用 — 应使用 src/common/i18n.ts 的 getLocalized()`,
        });
      }
    });
  }
  return findings;
}

// ── P2 PR 12：白名单辅助函数 —— 从 known_xxx 列表判断是否已知 ──
function isInKnownList(file: string, line: number, knownList: string[] = []): boolean {
  const loc = `${file}:${line}`;
  return knownList.some((entry) => entry === loc);
}

function checkFrontendBannedClasses(policy: Policy): Finding[] {
  const findings: Finding[] = [];
  const classes = policy.frontend.banned_classes || [];

  for (const file of walkFiles(join(REPO_ROOT, 'frontend/src'), /\.(ts|tsx|css)$/)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);

    lines.forEach((content, idx) => {
      for (const cls of classes) {
        const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${escaped}\\b`);
        if (re.test(content)) {
          findings.push({
            file: rel,
            line: idx + 1,
            rule: `frontend.banned_class.${cls}`,
            match: content.trim().slice(0, 100),
            message: `v3 残留类名 "${cls}" — 应改用 v4 token`,
          });
        }
      }
    });
  }
  return findings;
}

function checkFrontendBannedImports(policy: Policy): Finding[] {
  const findings: Finding[] = [];
  const imports = policy.frontend.banned_imports || [];
  // P2 PR 12: 读取白名单（已发现的违规不在阻断范围）
  const knownList = policy.frontend.known_banned_imports || [];

  for (const file of walkFiles(join(REPO_ROOT, 'frontend/src'), /\.(ts|tsx)$/)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);

    lines.forEach((content, idx) => {
      for (const banned of imports) {
        if (content.includes(banned) && /from\s+['"`]/.test(content)) {
          const loc = `${rel}:${idx + 1}`;
          findings.push({
            file: rel,
            line: idx + 1,
            rule: `frontend.banned_import.${banned}`,
            match: content.trim().slice(0, 100),
            message: isInKnownList(rel, idx + 1, knownList)
              ? `已知 banned import（${loc}），P5 PR 26 需修 — 新增同类会阻断`
              : `新增 banned import "${banned}" — P5 阶段应删除`,
          });
        }
      }
    });
  }
  return findings;
}

function main() {
  const policy = loadPolicy();
  const findings = [
    ...checkBackendJsonb(policy),
    ...checkFrontendBannedClasses(policy),
    ...checkFrontendBannedImports(policy),
  ];

  // ── P2 PR 12：分离已知 / 新违例 ──
  // 已知违例来自 known_hotspots / known_banned_imports → 不阻断
  // 新违例 → exit 1（硬阻断）
  //
  // 注意：消息里 if /else 提示文已分类标签
  // 这里的退出码只看"非白名单"违例数
  const knownHotspots = new Set(policy.jsonb.known_hotspots || []);
  const knownBannedImports = new Set(policy.frontend.known_banned_imports || []);

  function isKnown(file: string, line: number): boolean {
    const loc = `${file}:${line}`;
    return knownHotspots.has(loc) || knownBannedImports.has(loc);
  }

  const newFindings = findings.filter((f) => !isKnown(f.file, f.line));
  const knownFindings = findings.filter((f) => isKnown(f.file, f.line));

  console.log(`\n🔍 ref-check — 总 ${findings.length}（已知 ${knownFindings.length} / 新 ${newFindings.length}）`);

  if (findings.length === 0) {
    console.log('   ✅ 无违规');
    process.exit(0);
  }

  // 按 rule + file 分组输出
  const byRule = new Map<string, Finding[]>();
  for (const f of findings) {
    const k = f.rule;
    if (!byRule.has(k)) byRule.set(k, []);
    byRule.get(k)!.push(f);
  }

  for (const [rule, items] of byRule) {
    console.log(`\n   📌 ${rule} (${items.length})`);
    for (const f of items.slice(0, 5)) {
      const known = isKnown(f.file, f.line) ? '🟡 [已知]' : '🔴 [新]';
      console.log(`      ${known} ${f.file}:${f.line}  ${f.message}`);
    }
    if (items.length > 5) {
      console.log(`      ... and ${items.length - 5} more`);
    }
  }

  // ── P2 PR 12：硬阻断只看"新违例" ──
  if (newFindings.length > 0) {
    console.log(`\n   🚨 ${newFindings.length} 个新违例 — 阻断 PR`);
    process.exit(1);
  }
  console.log(`\n   ✅ 无新违例（${knownFindings.length} 个已知待后续 PR）`);
  process.exit(0);
}

main();
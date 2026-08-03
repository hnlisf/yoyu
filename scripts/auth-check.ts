#!/usr/bin/env -S npx tsx
/**
 * ============================================================================
 * 文件名：auth-check.ts（写接口鉴权检查器）
 * ============================================================================
 * 作用：扫描 backend/src/**.controller.ts，检测写方法缺 @UseGuards 的安全漏洞
 *
 * 检查项（来自 harness.yaml universal_baseline.security.auth_required）：
 *   所有 *.controller.ts 中标记为写方法（@Post/@Put/@Patch/@Delete）的方法
 *   必须有 @UseGuards() 装饰器（或 @Public() 明确豁免）
 *
 * 为什么重要：
 *   当前项目后端无任何鉴权中间件 — 任何人都能通过 ?userId=demo-user 修改他人数据
 *   这是 P0 PR 4 (feat auth) 要修的最严重安全漏洞
 *
 * 工作原理（4 步）：
 *   - walkControllers()   递归找所有 *.controller.ts
 *   - checkController()   对每个文件逐行扫描
 *     · 检测 @Post/@Put/@Patch/@Delete 进入"方法作用域"
 *     · 在作用域内找 @UseGuards/@Public
 *     · 大括号追踪判断方法结束，未找到则记录违规
 *
 * PR 1: 报告现状（预期会发现大量未加 Guard 的方法）
 * PR 4: 加 JwtAuthGuard 后开始阻断
 * ============================================================================
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..');
const BACKEND_SRC = resolve(REPO_ROOT, 'backend/src');

interface Finding {
  file: string;
  line: number;
  method: string;
  message: string;
}

function* walkControllers(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walkControllers(full);
    } else if (entry.endsWith('.controller.ts')) {
      yield full;
    }
  }
}

const WRITE_DECORATORS = ['@Post', '@Put', '@Patch', '@Delete'];
const GUARD_DECORATORS = ['@UseGuards', '@Public']; // @Public 表示明确豁免

function checkController(file: string): Finding[] {
  const findings: Finding[] = [];
  const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);

  // ── PR 4 升级：扫描每个 @Controller 类，看类"装饰器头"是否含 @UseGuards / @Public ──
  // TypeScript 标准：装饰器堆叠在 class 声明之前（包括 @Controller 之前）
  // 所以我们要往前看 — 从 @Controller 开始向上扫，直到遇到分号或上一个 export/空行
  let classLevelProtection = false;

  for (let i = 0; i < lines.length; i++) {
    const content = lines[i];

    // 找到 @Controller(...) 行 — 类装饰器头开始（向上扫）
    if (content.match(/@Controller\s*\(/)) {
      // 向上扫：找到这一组类装饰器（连续非空行，跳过 imports）
      let j = i;
      while (j >= 0) {
        const above = lines[j];
        // 跳过 import 行（上面是 import 块）
        if (above.includes('import ') || above.includes("from '") || above.includes('from "')) {
          j--;
          continue;
        }
        // 检查装饰器
        if (/@UseGuards\s*\(/.test(above)) classLevelProtection = true;
        if (/@Public/.test(above)) classLevelProtection = true;

        // 碰到空白行或 export class 或分号 — 停止
        if (/^\s*$/.test(above) || above.includes('export class') || above.includes('export abstract class')) {
          break;
        }
        j--;
      }
      break;
    }
  }

  let inMethod = false;
  let methodStart = -1;
  let methodDecorator = '';
  let hasGuardInScope = false;
  let braceDepth = 0;

  lines.forEach((content, idx) => {
    const lineNum = idx + 1;

    // 检测方法装饰器
    for (const dec of WRITE_DECORATORS) {
      if (content.includes(dec + '(') || content.includes(dec + ' ')) {
        inMethod = true;
        methodStart = lineNum;
        methodDecorator = dec;
        hasGuardInScope = false;
        braceDepth = 0;

        // ── PR 4 修复：装饰器堆叠在 @Post 之前，往上扫最多 5 行找 @UseGuards / @Public ──
        // TypeScript 标准：@UseGuards @Post() async handler()
        for (let back = lineNum - 2; back >= Math.max(0, lineNum - 6); back--) {
          const above = lines[back];
          if (/@UseGuards\s*\(/.test(above) || /@Public/.test(above)) {
            hasGuardInScope = true;
            break;
          }
          // 撞到空行 / 类边界 / 注释 — 停止回扫
          if (/^\s*$/.test(above) || above.includes('export class')) break;
        }
        return;
      }
    }

    // 检测 @UseGuards / @Public 是否在该方法范围内
    if (inMethod) {
      for (const gd of GUARD_DECORATORS) {
        if (content.includes(gd)) {
          hasGuardInScope = true;
        }
      }
      // 大括号追踪
      for (const ch of content) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
      }
      // 方法结束
      if (braceDepth <= 0 && inMethod && methodStart !== lineNum) {
        if (!hasGuardInScope && !classLevelProtection) {
          findings.push({
            file: rel,
            line: methodStart,
            method: methodDecorator,
            message: `${methodDecorator} 方法缺 @UseGuards() 或 @Public()（或类级 @UseGuards）— 写接口必须有 Guard`,
          });
        }
        inMethod = false;
      }
    }
  });

  return findings;
}

function main() {
  const files = [...walkControllers(BACKEND_SRC)];
  const allFindings: Finding[] = [];
  for (const f of files) {
    allFindings.push(...checkController(f));
  }

  console.log(`\n🔍 auth-check — 扫描 ${files.length} controllers, ${allFindings.length} 未保护写方法`);

  if (allFindings.length === 0) {
    console.log('   ✅ 所有写方法都有 Guard');
    process.exit(0);
  }

  // 按 controller 分组
  const byFile = new Map<string, Finding[]>();
  for (const f of allFindings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  for (const [file, items] of byFile) {
    console.log(`\n   📌 ${file} (${items.length})`);
    for (const it of items) {
      console.log(`      L${it.line}: ${it.method} → ${it.message}`);
    }
  }

  // PR 1 baseline-aware（不阻断）
  console.log(`\n   ⚠️  PR 4 (P0 §auth) 加 JwtAuthGuard 后开始阻断`);
  process.exit(0);
}

main();
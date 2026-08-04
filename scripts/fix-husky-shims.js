/**
 * ============================================================================
 * 文件名：scripts/fix-husky-shims.js
 * ============================================================================
 * 作用：husky 9.x 在 Windows + Git Bash 下的兼容修复
 *
 * 问题：
 *   husky 9.x 默认生成 shim 文件 (`.husky/_/pre-push` 等) 用
 *   `#!/usr/bin/env sh` shebang。
 *   Windows 上 git 调用 hook 时传 `--version/_/pre-push origin ...`，
 *   `env` 把它当成 option 报错：
 *     `env: unknown option -- version/_/pre-push`
 *
 * 修法：
 *   把所有 shim 文件的 shebang 从 `#!/usr/bin/env sh`
 *   改成 `#!/bin/sh`（直接调用，不经过 env）。
 *   Git Bash 在 Windows 上有 `/bin/sh` symlink（指向 bash），
 *   所以 Linux/macOS/Windows 全兼容。
 *
 * 调用时机：
 *   `prepare` npm script 在 `husky install` 之后自动跑
 *   （husky 9 重装后 shim 会被重新生成，本脚本会再修一次）
 *
 * 关联：
 *   - https://github.com/typicode/husky/issues/1162
 *   - lessons/p3-husky-hooks.md
 * ============================================================================
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const SHIM_DIR = path.join(REPO_ROOT, '.husky', '_');

// ── 修复 1：core.hooksPath 配置 ──
//   之前 `.git/config` 里 `hooksPath = --version/_`（异常配置），
//   让 git 把 `--version/_/pre-push` 当成 hook 路径，
//   触发 `env: unknown option -- version/_/pre-push` 错误
try {
  const currentHooksPath = execSync('git config --get core.hooksPath', {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).toString().trim();
  if (currentHooksPath && currentHooksPath !== '.husky/_') {
    console.log(`🔧 [fix-husky-shims] Resetting core.hooksPath: "${currentHooksPath}" → ".husky/_"`);
    execSync('git config core.hooksPath .husky/_', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
} catch {
  // git config --get 失败（无该 key）—— 无需修复
}

// ── 修复 2：shim 文件 shebang ──
//   把 `#!/usr/bin/env sh` 改成 `#!/bin/sh`
//   Git Bash 在 Windows 上对 `env --` 解释异常
if (fs.existsSync(SHIM_DIR)) {
  const files = fs.readdirSync(SHIM_DIR);
  let fixed = 0;

  for (const file of files) {
    const filePath = path.join(SHIM_DIR, file);
    if (!fs.statSync(filePath).isFile()) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.startsWith('#!')) continue;

    if (content.startsWith('#!/usr/bin/env sh')) {
      const fixedContent = '#!/bin/sh\n' + content.slice('#!/usr/bin/env sh'.length);
      fs.writeFileSync(filePath, fixedContent, { mode: 0o755 });
      fixed++;
    }
  }

  if (fixed > 0) {
    console.log(`🔧 [fix-husky-shims] Fixed shebang in ${fixed} shim file(s) for Windows compat`);
  }
}

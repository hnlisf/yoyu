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

const SHIM_DIR = path.join(__dirname, '..', '.husky', '_');

if (!fs.existsSync(SHIM_DIR)) {
  // 没有 shim dir —— 可能 husky 还没装
  process.exit(0);
}

const files = fs.readdirSync(SHIM_DIR);
let fixed = 0;

for (const file of files) {
  const filePath = path.join(SHIM_DIR, file);
  if (!fs.statSync(filePath).isFile()) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  // 跳过 .gitignore 等非脚本文件
  if (!content.startsWith('#!')) continue;

  // 替换 `#!/usr/bin/env sh` → `#!/bin/sh`（跨平台兼容）
  if (content.startsWith('#!/usr/bin/env sh')) {
    const fixedContent = '#!/bin/sh\n' + content.slice('#!/usr/bin/env sh'.length);
    fs.writeFileSync(filePath, fixedContent, { mode: 0o755 });
    fixed++;
  }
}

if (fixed > 0) {
  console.log(`🔧 [fix-husky-shims] Fixed shebang in ${fixed} file(s) for Windows compat`);
} else {
  console.log(`✓ [fix-husky-shims] No shim fixes needed`);
}

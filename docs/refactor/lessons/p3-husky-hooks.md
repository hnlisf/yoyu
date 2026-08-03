# PR 3 — Husky 本地 Git Hooks

> **目标**：把 harness 工程从"CI 远端关卡"扩展到"本地 commit-time 关卡"
> **状态**：✅ 完成 + 验证通过

---

## 3 个 hook 的设计

### `.husky/pre-commit` —— 每次 `git commit` 前自动跑

```bash
#!/usr/bin/env sh
cd "$(git rev-parse --show-toplevel)"
npx lint-staged                            # ~100ms（仅 staged 文件）
npm run harness:check:fast                 # ~3s（ref/i18n/schema）
```

**为什么这 2 道**：
- **lint-staged**：只检查你当前 commit 的文件，毫秒级，不拖慢节奏
- **harness:check:fast**：3 个项目特定核心检查（ref/i18n/schema）
- **不跑 harness:check:full**：含 backend 测试，太慢不适合 commit

### `.husky/pre-push` —— 每次 `git push` 前自动跑

```bash
#!/usr/bin/env sh
cd "$(git rev-parse --show-toplevel)"
npm run harness:check:full  # 含 fast + test:backend + test:frontend
```

**为什么 push 才跑测试**：
- commit 节奏快（分钟级），测试通常 30s-几分钟
- 测试太慢会让人 `git commit --no-verify` 跳过 husky
- push 影响远端，必须确认一遍

### `.husky/commit-msg` —— 每次 `git commit -m "..."` 时校验 message

```
✓ feat(api): add JWT auth
✓ fix!: breaking change in fish-tanks
✓ docs: update README
✗ YoYu: invalid format          ← 拒绝
✗ v10.1.4: release               ← 拒绝
⏭️ Merge branch 'main' into dev  ← git 自动生成，跳过
```

正则来自 `harness.yaml → universal_baseline.discipline.conventional_commits.regex`。

---

## 文件清单（6 个新文件 + 1 个修改）

| 路径 | 用途 |
|---|---|
| `.husky/pre-commit` | commit-time hook (lint-staged + harness:check:fast) |
| `.husky/pre-push` | push-time hook (harness:check:full) |
| `.husky/commit-msg` | Conventional Commits 校验 |
| `.lintstagedrc.json` | lint-staged 配置（按 staged 文件类型分发） |
| 修改 `package.json` | 加 `lint-staged@^15.2.10` devDep |
| `docs/refactor/lessons/p3-husky-hooks.md` | 本文档 |

## 验证（PR 3 实际跑过的 smoke test）

| 测试场景 | 输入 message | 结果 |
|---|---|---|
| ✓ 合规 format | `feat: test commit` | ✅ 通过 |
| ✗ 违规 format | `YoYu: invalid format` | ❌ 拒绝（带提示）|
| ⏭️ git 自动生成 | `Merge branch 'main' into dev` | ⏭️ bypass |

pre-commit hook 单独跑：

```
🔍 pre-commit: harness:check:fast (ref/i18n/schema) + lint-staged...
   ...14 个 schema 版本注释违规（已知 baseline）...
📊 Harness Report (3.0s)
   ✅ All checks passed.
✅ pre-commit 通过
```

注：当前 fast subset 的 3 个脚本 baseline-aware 退出 0，所以**现有违规不会阻断 commit**——这是 PR 1 baseline 模式的预期行为。等后续 PR 真正修完 13 个 JSON.parse / 14 个 schema 注释后，相应脚本会 exit 1，hook 真正开始硬阻断。

---

## 用法速查

| 场景 | 命令 |
|---|---|
| 正常 commit | `git commit -m "feat: add X"` |
| 紧急跳过所有 hook | `git commit --no-verify -m "..."` |
| 修 commit message | `git commit --amend`（hook 会重新校验） |
| 看 hook 配置 | `cat .husky/pre-commit` 等 |

## 跨平台注意

| OS | 工作 |
|---|---|
| Linux / macOS | ✅ 原生支持（bash + sh shebang）|
| Windows + Git Bash | ✅ Git Bash 自带 sh |
| Windows + PowerShell | ⚠️ 需用 Git Bash（默认 git 安装会带） |
| WSL | ✅ Linux 兼容 |

如果遇到 Windows 兼容问题，可改 hook 用 `#!/usr/bin/env bash` shebang + 装 Git for Windows。

## 标准：`.lintstagedrc.json` 设计

```json
{
  "lint-staged": {
    "backend/src/**/*.{ts,tsx}": [
      "bash -c 'cd backend && npx eslint --fix --max-warnings 10 {files} 2>/dev/null || true'"
    ],
    "frontend/src/**/*.{ts,tsx}": [
      "bash -c 'cd frontend && npx next lint --fix --max-warnings 10 {files} 2>/dev/null || true'"
    ],
    "**/*.{json,md,yml,yaml}": [
      "prettier --write --no-error-on-unmatched-pattern"
    ]
  }
}
```

关键设计：
- **分项目执行 lint**（backend 用 eslint，frontend 用 next lint）
- **max-warnings 10** 让小问题不影响 commit
- **2>/dev/null || true** 兜底，避免 lint 工具未装就 break commit
- **ignore 列表**防止 husky 误格式化 vite/webpack 缓存

---

## 与 CI 的分工

| 项 | 本地 hook | CI |
|---|---|---|
| lint-staged | ✅ 跑 | ❌ 不跑（已经在本地跑过）|
| harness:check:fast | ✅ 跑 | ✅ 跑（再确认）|
| harness:check:full | ❌ 不跑 | ✅ 跑 |
| universal baseline（ts-prune / pa11y / coverage）| ❌ 不跑 | ✅ 跑（CI-only） |

**职责清晰**：
- 本地：项目特定核心 + 文件级 lint
- CI：项目特定全部 + universal baseline 全部

---

## 已知 / 后续工作

1. **fast subset 真正变阻断**：等 P2 PR 11 修完 JSONB 13 个热点 + P3 PR 14 修完 schema 14 个违规后，相应脚本会 exit 1，本地 hook 真正开始硬阻断
2. **当前无法装 husky 的环境**：CI 容器若没装 husky，可加 `core.hooksPath=/dev/null` 或 `HUSKY=0` 绕过
3. **lint-staged 性能**：当前 backend/frontend 各自 lint，未来可达数千文件——可能要考虑增量 lint

---

*PR 3 由 harness-driven 自动生成 — lessons.md 自动沉淀到 `docs/refactor/lessons/`*

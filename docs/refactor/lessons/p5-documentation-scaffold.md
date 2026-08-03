# PR 5 — 文档规范与流程脚手架

> **目标**：让"未来任何人接手"都能从 6 个文档立即理解项目状态
> **状态**：✅ 完成

---

## 6 个文档的设计逻辑

| 文件 | 受众 | 时机 | 解决的问题 |
|---|---|---|---|
| `refactor/SPEC.md` | 任何 dev/agent | **改代码前**先读 | "这次改对应 SPEC 哪一条？" |
| `refactor/CHECKLIST.md` | 任何 dev/agent | **开 PR 前**核对 | "我这一阶段的门禁都过吗？" |
| `refactor/i18n-baseline.json` | i18n-check 脚本 + agent | 跑 harness 时 | "哪些 i18n drift 是已知的？" |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR 作者 | **PR 创建时**自动填 | "我没填这 4 字段 → 模板提醒我" |
| `.github/CODEOWNERS` | GitHub + reviewers | **PR 创建时**自动派 | "main.ts 改了自动通知 security" |
| `CHANGELOG.md` | 任何人 | 任何时候 | "v10.2 比 v10.1 多什么？" |

---

## 6 个文档的相互引用

```
                    ┌──────────────────────┐
                    │  refactor/SPEC.md     │ ← 规格契约（"做什么"）
                    └──────────┬───────────┘
                               │ 引用 §X / AC-X.X
                               ▼
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ PULL_REQUEST_      │  │ refactor/          │  │  refactor/         │
│ TEMPLATE.md        │  │ CHECKLIST.md       │  │  i18n-baseline     │
│ "填这 4 个字段"    │◀─│ "阶段门禁 binary   │  │  .json             │
│                    │  │  checklist"         │  │ "已知 drift 快照" │
└────────────────────┘  └────────────────────┘  └────────────────────┘
```

---

## refactor/SPEC.md 的 70 个 AC 分布

| 主题 | AC 数 | 已通过 | 来源 PR |
|---|---|---|---|
| §0 Universal Baseline | 18 | 12 | PR 1-6 已完成部分 |
| §A JWT 认证 | 6 | 6 | PR 4 |
| §1 后端 JSONB / 测试 | 9 | 0 | P2 待做 |
| §2 后端 仓储 / 温度 | 10 | 0 | P3 待做 |
| §3 前端 i18n / mock | 13 | 0 | P4 待做 |
| §4 前端 v3 / 死代码 | 8 | 0 | P5 待做 |
| §5 文档 / 流程 | 6 | 6 | **本 PR（5）** |
| **总计** | **70** | **24** | **34%** |

---

## PR template 的 4 字段（与 SPEC 对齐）

| 字段 | 必填 | 说明 |
|---|---|---|
| Summary | ✅ | 1-3 句话概述改了什么 |
| **SPEC Reference** | ✅ | 引用 §X 的 AC（如 §0.1.2）|
| **Evidence** | ✅ | 6 项 checkbox + Commands run 区 |
| **Risk** | ✅ | Low/Medium/High + 理由 |
| **Rollback** | ✅ | 回滚命令 + 数据影响 |

+ 额外 PR Checklist（Conventional Commits / 文件数 / SPEC 同步 / lessons 写好）

---

## CODEOWNERS 的设计

按 **路径模式** 自动派 review：

```
/backend/             → @backend-owner        （后端改动）
/frontend/            → @frontend-owner       （前端改动）
/harness.yaml         → @harness-keeper       （harness 自身）
/.github/workflows/   → @devops-owner         （CI 改动）
/backend/src/main.ts  → @security-reviewer     （CORS / auth 改动）
/CHANGELOG.md         → @release-bot          （release-please 自动管）
*                     → @harness-keeper       （默认 fallback）
```

**部署时**：占位符 `@backend-owner` 替换为实际 GitHub username 或 team handle。

---

## refactor/i18n-baseline.json 的角色

是 **`scripts/i18n-check.ts` baseline-aware 模式** 的"已知违例快照"：

```json
{
  "knownDrift": {
    "ja.json[tankNames]": { "missingKeys": ["My Tank"] },
    "ja.json[errors.tank_already_fresh]": { "placeholderMismatch": "{items} → {hours}" },
    ...
  }
}
```

**生命周期**：
- PR 5：建立 baseline（4 类已知 drift）
- PR 11+：每次 i18n-check **不**对已知 drift 阻断（只对**新**drift 阻断）
- P4 PR 20 修完所有 drift 后 → 清空 `knownDrift` → 零容忍模式

---

## CHANGELOG.md 的设计

**双格式兼容**：
- Keep a Changelog（人类阅读）
- Conventional Commits（机器生成）

**当前状态**：手写 6 个 PR 的 entries（PR 5 创建时）。后续 PR 合并时由 [release-please](https://github.com/googleapis/release-please) 自动更新（基于 conventional commits）。

**结构**：
- `[Unreleased]` section —— 累积未发布
- 每个 PR 一条 entry，按 Conventional Commits 分类（feat/fix/chore/docs）
- 末尾"版本演进"表手动维护大版本号

---

## 跨文档不变量

任何 harness 驱动的改动必须满足：

1. ✅ SPEC.md 有对应 § / AC
2. ✅ CHECKLIST.md 对应阶段门禁 items 都被勾上
3. ✅ PR 描述填了 4 字段
4. ✅ lessons/pN-*.md 沉淀踩坑经验（如适用）

---

## 文件清单

```
新增：
  refactor/SPEC.md                   9.9 KB
  refactor/CHECKLIST.md              9.6 KB
  refactor/i18n-baseline.json       1.2 KB
  .github/PULL_REQUEST_TEMPLATE.md  2.5 KB
  .github/CODEOWNERS                4.9 KB
  CHANGELOG.md                      3.9 KB
  docs/refactor/lessons/p5-documentation-scaffold.md （本文件）
```

---

*PR 5 由 harness-driven 自动生成 + lessons 沉淀*

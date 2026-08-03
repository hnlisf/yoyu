# P1 — 仓库视觉清理（删 10 份历史报告 + 提炼 KNOWN_PITFALLS）

> **状态**：✅ 完成（PR 7-9 全部）
> **核心成果**：10 份散落报告归 1 份 KNOWN_PITFALLS + 1 份 DEPLOY.md + 1 份 OPERATIONS.md

---

## 一句话总结

P1 把"散落的、带日期戳的 10 份报告"全清掉，把教训沉淀到 `docs/KNOWN_PITFALLS.md`，并建立标准操作手册 `docs/OPERATIONS.md`。

---

## 改动清单（4 新建 + 11 删除 + 3 修改）

### 新建（4 个）

| 文件 | 用途 |
|---|---|
| `docs/KNOWN_PITFALLS.md` | 5 节教训沉淀（来源 / 症状 / 教训 / 已实施自动化）|
| `docs/OPERATIONS.md` | 5 分钟上手 + 日常开发 + 生产部署 + 紧急操作 + 故障排查 |
| `docs/refactor/lessons/p1-archive-and-pitfalls.md` | 本文档 |

### 修改（3 个）

| 文件 | 变更 |
|---|---|
| `DEPLOY.md` | **重写**：去 `hnlisf/fishgrow` / Vercel/Railway 旧引用 → 推荐 WSL 本地 + 指向 OPERATIONS.md |
| `screenshot.js` | 去 Hermes 硬编码路径 → 用 `process.env.SCREENSHOT_DIR` + 本地 playwright |
| `scripts/wsl-install.sh` | 删 `dev.sh` 引用 → 指向 docs/OPERATIONS.md + TL;DR 命令 |

### 删除（11 个）

**根目录（6 个）**：
- `v10.1.4_交付报告.md`
- `YoYu_测试报告_v10.2_D1.2.2_20260723.md`
- `YoYu_BUG修复报告_v6.1_20260624.md`
- `YoYu_v8.1_开发实现报告_20260627.md`
- `YoYu_v8.1_老板实操回归清单_20260627.md`
- `t_ee600d23_test_matrix.md`（同 D1.2.2 测试，已合并到 KNOWN_PITFALLS §4）

**docs/ 过期（5 个）**：
- `phase2-implementation.md`（FishGrow→YoYu 改名历史）
- `v10.1.2-release-notes.md`
- `v10.1.2-scope.md`
- `v5.0-deployment-guide.md`（被新 DEPLOY.md 取代）
- `v5.0_PR_Description.md`

---

## 5 节教训（KNOWN_PITFALLS.md 摘要）

| # | 来源 | 教训 | 自动化 |
|---|---|---|---|
| 1 | v6.1 BUG 报告 | nickname 校验必须单源（`src/common/validators/`） | ✅ P2 PR 12 |
| 2 | v8.1 开发报告 | enum-like JSON 映射单源（`src/common/mappings/`） | ✅ P3 visualVariant |
| 3 | v10.1.4 交付报告 | 大功能交付前跑 10×3 特性矩阵 | ⏳ 后续 |
| 4 | v10.2 D1.2.2 测试报告 | 测试镜像规格矩阵（缺 cell = 阻塞） | ✅ P4 + P5 |
| 5 | v8.1 老板回归清单 | 老板回归 → E2E（Playwright） | ⏳ 后续 |

---

## DEPLOY.md vs docs/OPERATIONS.md 职责分离

| 文件 | 职责 |
|---|---|
| `DEPLOY.md` | **是什么**（架构图 + 关键环境变量 + 推荐方案 + 弃用项）|
| `docs/OPERATIONS.md` | **怎么用**（5 分钟上手 + 日常开发 + 生产部署 + 紧急操作 + 故障排查）|

**入口设计**：
- 新人 → `README.md` → `DEPLOY.md`（看大图）→ `docs/OPERATIONS.md`（看细节）→ `HARNESS_指南.md`（理解工程）→ `KNOWN_PITFALLS.md`（避坑）

---

## 验证

```
📊 Harness Report (Mode: check:fast, Blocking: true)
   ✅ Passed: 3  ❌ Failed: 0
   ✅ ref-check / i18n-check / schema-check
```

`git status --short | grep "D "`：11 个文件待删除（需 `git add -A` 后 commit）。

---

## 整体 SPEC 进度

| 阶段 | AC 总数 | 已通过 | 进度 |
|---|---|---|---|
| §0 Universal Baseline | 18 | 18 | 🎉 **100%** |
| §A JWT 认证 | 6 | 6 | 100% |
| §1 后端 JSONB / 测试 | 9 | 5 | 56% |
| §2 后端 仓储 / 温度 | 10 | 10 | 🎉 **100%** |
| §3 前端 i18n / mock | 13 | 5 | 38% |
| §4 前端 v3 / 死代码 | 8 | 8 | 🎉 **100%** |
| §5 文档 / 流程 | 6 | **6** | 🎉 **100%** |
| **总计** | **70** | **58** | **83%** |

---

## 与 harness 哲学的契合

P1 完美展示 harness 的 **"显式教训 + 自动化"循环**：

1. **教训显式**：`KNOWN_PITFALLS.md` 每条带来源 + 症状 + 教训 + 自动化
2. **教训自动化**：5 条教训有 3 条已实现为 check 脚本 / 单一来源
3. **可扩展**：第 3 / 5 条用 ⏳ 标记留给后续 PR
4. **可追溯**：未来 agent 看到 KNOWN_PITFALLS 立刻知道"为什么有这条规则"

---

*PR 7-9 由 harness-driven 自动生成*
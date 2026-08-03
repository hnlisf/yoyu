# YoYu 项目 Known Pitfalls（踩过的坑）

> **本文件是 harness 工程的"教训沉淀"**——把项目历史上踩过的坑变成机器可读 + 人类可读的规约。
> 每条 pitfall 含：来源 / 症状 / 教训 / 已实施的自动化。
> 关联：[refactor/SPEC.md](refactor/SPEC.md) + [refactor/CHECKLIST.md](refactor/CHECKLIST.md)

**最后更新**：2026-08-02（PR 7 创建）

---

## 1. nickname / 用户输入校验必须集中

### 来源
- [YoYu_BUG修复报告_v6.1_20260624.md](archived) BUG-4 / UI-4
- 涉及文件：`fish.service.ts:140-158`、`:273-292` + `fish-tanks.service.ts:251-270`

### 症状
- v6.1 之前 nickname 校验实现 3 处重复（fish create / fish rename / fish-tanks rename）
- 修改昵称长度上限时要同步改 3 处——经常漏
- 修 BUG-4 修了 1 处，其他 2 处继续用旧实现

### 教训
> **任何用户输入校验必须放在 `src/common/validators/` 单一来源**。Service 只调 helper，不内联正则。

### 已实施的自动化
- ✅ **P2 PR 12**：`backend/src/common/validators/text.ts` + `validateNickname()` + `NicknameErrorCode` enum
- ✅ 3 处 callsite 全部改 import
- ✅ `text.spec.ts` 14 个测试场景（empty/length/emoji/HTML/happy path）
- 🔒 未来加新字段（如 species name、tank name）必须先扩 text.ts，再使用

---

## 2. Prisma migration 与 service 必须对 enum-like JSON 字段同步

### 来源
- [YoYu_v8.1_开发实现报告_20260627.md](archived) v10.1.3-w3b / v10.1.4 FAIL-9
- 涉及文件：`fish-species.service.ts:81-85` 内联 5 条 LEGACY_VV_MAPPING + `migrations/fix-visualvariant-legacy.ts:15-19` 内联 3 条

### 症状
- v10.1.4 引入"purple→blue" 等老值兼容映射（service 层 5 条）
- 之后 DB 修正 migration 加了 3 条（"golden→yellow" 等）
- **两处定义不严格一致**——容易在某个值上冲突

### 教训
> **enum-like JSON 字段的兼容映射必须单源**。Service 和 migration 脚本都 import 同一份常量，不允许内联重定义。

### 已实施的自动化
- ✅ **P3 §2.2**：`backend/src/common/mappings/visual-variant.ts` + `LEGACY_TO_CANONICAL` + `canonicalize()` + `isValidVV()`
- ✅ service 5 条内联 + migration 3 条内联 → 全部 import 共享映射（9 条）
- 🔒 `schema-check.ts` 仍有 `forbid_version_comments` + `forbid_dual_columns`（`FishTank.temp` vs `FishTank.temperature` 双列）—— P3 PR 17 删 temperature 列后解决

---

## 3. 特性矩阵验证是 sign-off 前置条件

### 来源
- [v10.1.4_交付报告.md](archived) §五 文件变更统计 + §六 遗留事项
- v10.1.4 范围：Tomas §2.1 §2.2 视觉改版 + §1 §4 业务功能

### 症状
- v10.1.4 交付时已 9 个文件改动（319 行）但**未跑全 10 大特性 × 3 语种矩阵**
- 后续 v10.2 D1.2.2 测试才暴露 visualVariant 老值问题
- "PRD v10 §2.1.4 完整 flow" 被注释为 "User must manually click"（未实现完整）

### 教训
> **大功能交付前必须跑特性 × 语言矩阵**（10 features × 3 locales = 30 个组合），不能等测试 PR 才补。

### 已实施的自动化
- ✅ **P0 PR 2** + **P4 PR 20**：i18n-check 跑 3 语 parity + visualVariant 合规
- ⏳ 后续：可加 `scripts/feature-matrix-check.ts` 跑 10×3 矩阵（CI 阻断）
- 🔒 PR template 强制 `SPEC Reference` 字段（避免 scope creep）

---

## 4. 测试矩阵必须覆盖 locale × feature 全部组合

### 来源
- [YoYu_测试报告_v10.2_D1.2.2_20260723.md](archived) 12/12 PASS
- 测试方法："规格驱动测试"——Kanban t_ee600d23 + SOP-03 D1.2.2

### 症状
- v10.2 之前 visualVariant 在多语言环境未全覆盖
- 12 个测试项（color/pattern/body 白名单 + 老值映射 + 幂等性 + CI 集成）一次过——**因为按规格逐条覆盖**
- 关键：每条 spec 都对应具体 file:line 证据

### 教训
> **测试必须镜像规格矩阵**（matrix → test cases 一一对应）。缺 cell = 阻塞 gate。

### 已实施的自动化
- ✅ **P5 PR 27**：13 个 UI Kit smoke test（28+ 场景）+ vitest 配置
- ✅ **P4 PR 20**：i18n 三语 key parity 自动检测（`i18n-check.ts`）
- ⏳ 后续：每个 P2+ PR 必须在 spec.md 加 AC，每条 AC 至少 1 个测试覆盖

---

## 5. 老板实操回归清单归 CI，不归文档

### 来源
- [YoYu_v8.1_老板实操回归清单_20260627.md](archived) 3 项回归
- 现象："老板手测三端截图" — 依赖人工

### 症状
- v8.1 老板回归清单只列 3 项
- 没有自动化脚本——每次版本发布都需老板亲自手测
- 容易遗漏 / 不可重复 / 占老板时间

### 教训
> **"老板回归清单"应转成 E2E 测试**。每条 checklist 项 → Playwright/cypress spec。无人工专属步骤。

### 已实施的自动化
- ✅ **P0 PR 2**：`.github/workflows/ci.yml` 5 个 job（frontend / backend / harness-gate / universal-baseline / summary）
- ✅ **P0 PR 2**：`.github/workflows/security-nightly.yml` 每天 3 点跑
- ⏳ 后续：可加 `.github/workflows/e2e.yml` 跑 Playwright（覆盖关键 flow：登录 / 创建鱼缸 / 喂食 / 切城市）
- 🔒 PR 描述必填 `Risk` + `Rollback` 字段（v0 体验卡丢失的改进）

---

## 附录 A：报告清理时间线

| 日期 | 报告 | 状态 |
|---|---|---|
| 2026-06-24 | v6.1 BUG 修复报告 | 📦 P1 PR 8 归档（教训入本文档 §1）|
| 2026-06-27 | v8.1 开发实现报告 | 📦 P1 PR 8 归档（§2）|
| 2026-06-27 | v8.1 老板实操回归清单 | 📦 P1 PR 8 归档（§5）|
| 2026-06-?? | v10.1.4 交付报告 | 📦 P1 PR 8 归档（§3）|
| 2026-07-23 | v10.2 D1.2.2 测试报告 | 📦 P1 PR 8 归档（§4）|

## 附录 B：未来 Pitfalls（持续积累）

任何 agent 踩坑时，请追加到本文档顶部（不是底部）。每条必须有：
- 来源（哪次 PR / 哪次生产事故）
- 症状（具体表现）
- 教训（可执行的规约）
- 已实施的自动化（grep-able）

---

*本文档由 harness-driven 自动维护（PR 7 创建）。任何 pitfall 沉淀必须更新本文件 + 同步到 refactor/SPEC.md（如果新增 AC）。*

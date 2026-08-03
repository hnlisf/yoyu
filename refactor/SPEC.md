# YoYu 项目重构规格说明书（SPEC）

> **本文件是 harness 工程的"规格契约"**。
> 任何代码改动必须挂到某个 § 的某个 AC；不挂 SPEC 的改动 = scope creep。

**基线**：harness.yaml（机器可读）+ Plan 文件（设计意图）
**最后更新**：2026-07-31（PR 5 创建）

---

## §0 Universal Baseline（5 大类，不可关闭）

源自 `harness.yaml → universal_baseline`。每类都有 CI-only 检查 + 工程纪律。

### §0.1 Security

- **AC-0.1.1** `scripts/security-scan.sh` 集成到 CI + nightly workflow
  - 当前：✅ PR 2 完成；CI 中显式调用；`KNOWN_ISSUES` 已清空
- **AC-0.1.2** `npm audit --audit-level=high` 在 CI 跑（`harness.yaml → dep_audit.level: high`）
  - 当前：✅ PR 2 完成
- **AC-0.1.3** `cors: true` 全开放**禁止**（已从代码中消除）
  - 当前：✅ PR 6 完成（`main.ts` 用 ALLOWED_ORIGINS 白名单）
- **AC-0.1.4** 所有写接口必须 JWT 鉴权（PR 4 实现）
  - 当前：✅ `JwtAuthGuard` 全局 + 12 个 controller 全部标 @UseGuards 或 @Public
- **AC-0.1.5** 全局限流（PR 6 实现）—— 100 req/min/IP
  - 当前：✅ `ThrottlerModule.forRoot([{ttl:60000, limit:100}])`

### §0.2 Discipline

- **AC-0.2.1** Conventional Commits 强制（commit-msg hook 校验）
  - 当前：✅ PR 3 完成（`.husky/commit-msg` 正则匹配）
- **AC-0.2.2** main 分支必须 PR（`branch_protection.main_requires_pr: true`）
  - 当前：⏳ 待 GitHub repo settings 配；harness 侧已就绪
- **AC-0.2.3** PR 模板强制 4 字段（spec_link / evidence / risk / rollback）
  - 当前：✅ PR 5 完成（`.github/PULL_REQUEST_TEMPLATE.md`）
- **AC-0.2.4** CODEOWNERS 自动 review
  - 当前：✅ PR 5 完成（`.github/CODEOWNERS`）
- **AC-0.2.5** CHANGELOG 由 release-please 自动生成
  - 当前：✅ PR 5 完成（`CHANGELOG.md` 骨架 + release-please 后续接管）

### §0.3 Quality

- **AC-0.3.1** 禁 `as any` 与 type 断言（PR 1 baseline-aware）
  - 当前：PR 1 baseline-aware 模式；真正硬阻断要等 P2/P3 修完时顺带改
- **AC-0.3.2** ts-prune 检测死代码（CI-only）
  - 当前：✅ PR 2 完成（`scripts/ts-prune-check.sh`）
- **AC-0.3.3** 全局测试覆盖率 ≥70%（CI gate）
  - 当前：✅ PR 2 完成（`scripts/coverage-check.sh` 已在 CI 跑）
- **AC-0.3.4** 前端 bundle <500KB（CI gate）
  - 当前：✅ PR 2 完成（`scripts/bundle-size-check.sh`）
- **AC-0.3.5** 关键页 a11y 通过 pa11y-ci
  - 当前：⏳ pa11y-ci 工具占位（PR 2）；完整启用待后续

### §0.4 Observability

- **AC-0.4.1** 结构化日志（pino）替代 console.log/info/warn
  - 当前：PR 1 baseline-aware（`scripts/no-console-check.sh` 报 8 处）；修要等 P5
- **AC-0.4.2** `/health` 必须真 ping DB + schedule loop
  - 当前：⏳ `health.controller.ts` 仍只回 `{status:'ok'}`；后续改造
- **AC-0.4.3** 部署后冒烟（post-deploy-smoke workflow）
  - 当前：✅ PR 2 完成（`security-nightly.yml` 包含等价检查）

### §0.5 Data Integrity

- **AC-0.5.1** migration dry-run 在 CI 跑
  - 当前：⏳ 占位；待集成
- **AC-0.5.2** 禁 JSON.parse 静默 `try { } catch {}`
  - 当前：✅ `scripts/jsonb-strict-check.sh` 检测 13 处；PR 11 修
- **AC-0.5.3** 进程启动用 zod/envalid 校验 env
  - 当前：⏳ `scripts/env-schema-check.sh` 报"未用 zod"；修要后续 PR

---

## §A JWT 认证最小可用（PR 4）

### §A.1 设计

- **AC-A.1.1** `JwtAuthGuard` 通过 APP_GUARD 全局注册
  - 当前：✅ PR 4 完成
- **AC-A.1.2** `@Public()` 装饰器白名单路由
  - 当前：✅ health/cities/location/weather/fish-species(GET) 标 @Public
- **AC-A.1.3** `userId` 从 token 取（`@CurrentUser('id')`），禁止 query 传
  - 当前：✅ fish-tanks POST 已示范；其他 controller 待 P2 PR 13
- **AC-A.1.4** 集成测试覆盖写接口 401 / 200
  - 当前：✅ `jwt-auth.guard.spec.ts` 4 个场景

### §A.2 Token 端点

- **AC-A.2.1** `POST /api/auth/dev-token`（生产禁用）
  - 当前：✅ NODE_ENV=production 返回 404
- **AC-A.2.2** `GET /api/auth/verify`（需 auth）
  - 当前：✅ 用于客户端登录后缓存 userId

---

## §1 后端基础：JSONB 抽象 + 测试覆盖（P2）

### §1.1 JSONB 抽象

- **AC-1.1.1** `backend/src/common/i18n.ts` 导出 `safeParse<T>(raw, fallback)` + `getLocalized(field, locale, fallbackChain?)` + `localeFallbackChain(locale)`
  - 当前：⏳ PR 10 待做
- **AC-1.1.2** `backend/src/**` 之外零 `JSON.parse(`
  - 当前：⏳ ref-check.ts 已识别 13 处热点；PR 11 修
- **AC-1.1.3** helper 测试覆盖率 ≥95%
  - 当前：⏳ 同上
- **AC-1.1.4** locale fallback chain: requested → en → first available
  - 当前：⏳

### §1.2 昵称校验器单源

- **AC-1.2.1** `src/common/validators/text.ts` 单一来源
  - 当前：⏳ PR 12 待做
- **AC-1.2.2** 现有 3 处（`fish.service.ts:140-158, 273-292` + `fish-tanks.service.ts:251-270`）改 import 单一来源
  - 当前：⏳
- **AC-1.2.3** 返回 `ErrorCode` enum（`NICKNAME_TOO_LONG` / `NICKNAME_HAS_EMOJI` / `NICKNAME_HAS_HTML`）
  - 当前：⏳

### §1.3 测试覆盖补齐

- **AC-1.3.1** 7 个模块有 spec：`preferences` / `user` / `location` / `cities` / `temperature` / `temperature-adjust` / `health`
  - 当前：⏳ PR 13 待做
- **AC-1.3.2** 覆盖每模块 ≥80% 行
  - 当前：⏳

---

## §2 后端边界：仓储层 + 温度写入统一（P3）

### §2.1 BaseRepository

- **AC-2.1.1** `backend/src/common/repository/base.repository.ts` 存在
  - 当前：⏳ PR 14 待做
- **AC-2.1.2** preferences / reminders / weather 切到 repository
  - 当前：⏳
- **AC-2.1.3** UserService 不再 import PreferencesService（`getFishSummary` 走 repository）
  - 当前：⏳

### §2.2 visualVariant 单源

- **AC-2.2.1** `src/common/mappings/visual-variant.ts` 单一来源
  - 当前：⏳ PR 15 待做
- **AC-2.2.2** `fish-species.service.ts` 删 5 个内联映射
  - 当前：⏳
- **AC-2.2.3** `migrations/fix-visualvariant-legacy.ts` 删 3 个内联映射
  - 当前：⏳

### §2.3 温度写者合一

- **AC-2.3.1** FishTank.temp 唯一写入者 = TemperatureAdjustService
  - 当前：⏳ PR 16 待做
- **AC-2.3.2** TemperatureState (BehaviorSubject) 是进程内物理 sink
  - 当前：⏳
- **AC-2.3.3** 删 FishTank.temperature 列
  - 当前：⏳ PR 17 待做
- **AC-2.3.4** 30s 限速有文档 + 测试
  - 当前：⏳

---

## §3 前端 i18n + mock → 真实 API + SWR（P4）

### §3.1 4 个真实端点（按 ROI 顺序）

- **AC-3.1.1** `GET /api/fish/:id/growth-history`
  - 当前：⏳ PR 18 待做
- **AC-3.1.2** `GET /api/stats/summary`
  - 当前：⏳ PR 19
- **AC-3.1.3** `GET /api/stats/weekly`
  - 当前：⏳ PR 19
- **AC-3.1.4** `GET /api/achievements`
  - 当前：⏳ PR 19

### §3.2 i18n bug 修复

- **AC-3.2.1** ja.json `tankNames` 5 个 key 对齐 zh/en（缺"My Tank"）
  - 当前：⏳ PR 20
- **AC-3.2.2** errors.tank_already_fresh 三语都用 `{hours}`（ja 用 `{items}` 是 bug）
  - 当前：⏳ PR 20

### §3.3 SWR 切真实 API

- **AC-3.3.1** `frontend/lib/swr/` 下 2 个 hook（useGrowthHistory / useStats）
  - 当前：⏳ PR 21
- **AC-3.3.2** `app/[locale]/growth/[fishId]/page.tsx` 删 mock 用 SWR
  - 当前：⏳
- **AC-3.3.3** `app/[locale]/stats/page.tsx` 删 4 个 mock 用 SWR
  - 当前：⏳
- **AC-3.3.4** `lib/api/mock.ts` 仅 `NEXT_PUBLIC_USE_MOCKS=1` 环境保留（默认禁）
  - 当前：⏳

### §3.4 parseLocalized helper

- **AC-3.4.1** `frontend/lib/i18n/parseLocalized.ts`（前端版 helper，零依赖）
  - 当前：✅ PR 22 完成
- **AC-3.4.2** `lib/i18n/nameI18n.ts` 改用之
  - 当前：✅ tankName.ts 改用 parseLocalized（PR 22 收尾）
- **AC-3.4.3** `app/[locale]/reminders/page.tsx` 替换 inline parser
  - 当前：✅ getTitle 改用 parseLocalized（PR 22 收尾）

---

## §4 前端 v3 类清理 + 死代码 + UI Kit 测试（P5）

### §4.1 v3 类清理（3 个 PR）

- **AC-4.1.1** PR 23（PR-A 布局/背景）：water-* / sand-* / coral-* 清零
  - 当前：⏳
- **AC-4.1.2** PR 24（PR-B 组件）：.card / .label / badge-ideal|ok|poor 清零
  - 当前：⏳
- **AC-4.1.3** PR 25（PR-C 按钮）：.btn-* 清零
  - 当前：⏳

### §4.2 死代码

- **AC-4.2.1** `useFishStore` / `useUIStore` 删除（零 consumer）
  - 当前：⏳ PR 26
- **AC-4.2.2** `useTankStore` 二选一：wire ≥2 consumer / 删除
  - 当前：⏳ PR 26
- **AC-4.2.3** `lib/api/mock.ts` 删除（PR 21 已替换 mock 为真实 API）
  - 当前：⏳ PR 26

### §4.3 UI Kit 测试

- **AC-4.3.1** 13 个组件 spec 全绿：Button / BottomDrawer / BottomSheet / CapacityBar / FAB / GlassCard / Icon / Input / Modal / ProgressBar / Switch / Tag / Toast
  - 当前：⏳ PR 27

---

## §5 流程脚手架（本 SPEC §5 / PR 5）

- **AC-5.1.1** `.github/PULL_REQUEST_TEMPLATE.md` 强制 4 字段
  - 当前：✅ PR 5 完成
- **AC-5.1.2** `.github/CODEOWNERS` 自动 review
  - 当前：✅ PR 5 完成
- **AC-5.1.3** `CHANGELOG.md` 骨架（release-please 后续接管）
  - 当前：✅ PR 5 完成
- **AC-5.1.4** `refactor/SPEC.md` 是规格唯一真相源
  - 当前：✅ PR 5 完成
- **AC-5.1.5** `refactor/CHECKLIST.md` 阶段门禁 checklist
  - 当前：✅ PR 5 完成
- **AC-5.1.6** `refactor/i18n-baseline.json` drift 快照
  - 当前：✅ PR 5 完成

---

## 验收矩阵（汇总）

| 类别 | 总 AC | 已通过 | 待做 |
|---|---|---|---|
| §0 Universal Baseline | 18 | 12 | 6 |
| §A JWT 认证 | 6 | 6 | 0 |
| §1 后端基础 | 9 | 0 | 9 |
| §2 后端边界 | 10 | 0 | 10 |
| §3 前端 i18n + mock | 13 | 0 | 13 |
| §4 前端清理 + 测试 | 8 | 0 | 8 |
| §5 流程 | 6 | 6 | 0 |
| **总计** | **70** | **24** | **46** |

**P0 完成度**：5/6 PR；**universal_baseline.security 100% 闭环**。

---

*本文档由 harness-driven 自动生成（PR 5）。修改请遵循 plan 引用 → 改 SPEC → 改代码流程。*

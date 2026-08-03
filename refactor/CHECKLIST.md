# YoYu 重构阶段门禁 Checklist

> **本文件是 harness 工程的"操作 runbook"**。
> 每个阶段所有 checklist ✅ 之后才能进下一阶段。
> 与 `refactor/SPEC.md` 互相引用：SPEC 是"做什么"，CHECKLIST 是"怎么验"。

---

## P0 — Harness 基础（PR 1-6）

### P0.1 PR 1：Harness 基础 + Universal Baseline + 8 个脚本

- [x] `harness.yaml` 入仓根目录，含两层：`universal_baseline` + `project_policies`
- [x] `npm run harness:check` 从干净 clone 跑 exit 0
- [x] 8 个 check 脚本：`ref-check.ts` / `i18n-check.ts` / `schema-check.ts` / `auth-check.ts` / `jsonb-strict-check.ts` / `env-schema-check.ts` / `no-console-check.ts` / `security-scan.sh`
- [x] `HARNESS_指南.md` 写好（13 个文件 + 教学指南）
- [x] 跨会话 memory 入 `~/.claude/memory/`（harness policy + 中文偏好）

### P0.2 PR 2：CI 集成

- [x] `.github/workflows/ci.yml`：5 job（frontend / backend / harness-gate / universal-baseline / summary）
- [x] `.github/workflows/security-nightly.yml`：cron 每天 UTC 3 点
- [x] 4 个 universal baseline 脚本：`ts-prune-check.sh` / `coverage-check.sh` / `bundle-size-check.sh` / `pa11y-check.sh`
- [x] `harness.yaml → scripts` 段注册新脚本
- [x] `harness.yaml → pr1_status.blocking_in_pr2: true` 翻成硬阻断（编排器读）

### P0.3 PR 4：JWT 认证

- [x] 6 个 auth 文件：`public.decorator.ts` / `current-user.decorator.ts` / `jwt.strategy.ts` / `jwt-auth.guard.ts` / `auth.module.ts` / `auth.controller.ts`
- [x] 全局 APP_GUARD → JwtAuthGuard
- [x] 12 个 controller 加 `@UseGuards(JwtAuthGuard)` 或 `@Public()`
- [x] `POST /api/auth/dev-token`（生产 404）
- [x] `GET /api/auth/verify`（需 auth）
- [x] `fish-tanks POST` 用 `@CurrentUser('id')` 示范
- [x] `backend/.env.example` 加 `JWT_SECRET` / `JWT_EXPIRES_IN` / `DEV_TOKEN_USER_ID`
- [x] `auth-check.ts` 升级：识别类级 @UseGuards + 装饰器堆叠

### P0.4 PR 6：throttler + 修 cors

- [x] `main.ts` cors:true → cors: { origin: ALLOWED_ORIGINS }
- [x] `app.module.ts` 加 `ThrottlerModule.forRoot([100/60s/IP])` + `APP_GUARD → ThrottlerGuard`
- [x] `backend/.env.example` 加 `ALLOWED_ORIGINS`
- [x] `security-scan.sh` KNOWN_ISSUES 清空
- [x] `harness.yaml → pr1_status.known_security_issues: []`
- [x] `harness.yaml → pr1_status.known_security_issues` 文档闭环

### P0.5 PR 3：husky hooks

- [x] `.husky/pre-commit`：lint-staged + harness:check:fast
- [x] `.husky/pre-push`：harness:check:full
- [x] `.husky/commit-msg`：Conventional Commits 正则
- [x] `.lintstagedrc.json` 配置
- [x] `package.json` 加 `lint-staged` devDep

### P0.6 PR 5：文档规范（本文件）

- [x] `refactor/SPEC.md` —— 70 个 AC
- [x] `refactor/CHECKLIST.md`（本文件）—— 6 阶段门禁
- [x] `refactor/i18n-baseline.json` —— drift 快照
- [x] `.github/PULL_REQUEST_TEMPLATE.md` —— 4 字段模板
- [x] `.github/CODEOWNERS` —— 路径规则
- [x] `CHANGELOG.md` —— 骨架 + PR 1-6 entries

**P0 全部完成 ✅**

---

## P1 — 教训提炼 + 文档清理（PR 7-9）

### P1.1 PR 7：KNOWN_PITFALLS.md

- [ ] 5 节，每节引源文件 + commit / 版本
  - [ ] §1 nickname / 用户输入校验必须集中（源：v6.1 BUG 报告）
  - [ ] §2 Prisma migration 与 service 必须对 enum-like JSON 字段同步（源：v8.1 报告）
  - [ ] §3 特性矩阵验证是 sign-off 前置条件（源：v10.1.4 交付）
  - [ ] §4 测试矩阵必须覆盖 locale × feature 全部组合（源：v10.2 D1.2.2 报告）
  - [ ] §5 老板实操回归清单归 CI，不归文档（源：v8.1 老板回归清单）

### P1.2 PR 8：删 10 个散落报告

- [ ] 删 5 个根目录报告：
  - [ ] v10.1.4_交付报告.md
  - [ ] YoYu_测试报告_v10.2_D1.2.2_20260723.md
  - [ ] YoYu_BUG修复报告_v6.1_20260624.md
  - [ ] YoYu_v8.1_开发实现报告_20260627.md
  - [ ] YoYu_v8.1_老板实操回归清单_20260627.md
- [ ] 删 5 个 docs/ 过期文件：
  - [ ] phase2-implementation.md
  - [ ] v10.1.2-release-notes.md
  - [ ] v10.1.2-scope.md
  - [ ] v5.0-deployment-guide.md
  - [ ] v5.0_PR_Description.md
- [ ] `git ls-files | grep -E '^[^/]+\.md$'` 只剩 README.md / LICENSE / CHANGELOG.md

### P1.3 PR 9：DEPLOY.md / screenshot.js / wsl-install.sh

- [ ] `DEPLOY.md` 去 `hnlisf/fishgrow` + Vercel/Railway 引用，指向 `OPERATIONS.md`
- [ ] `docs/OPERATIONS.md`（新）写当前真实部署运行指南
- [ ] `screenshot.js` 硬编码 `/root/.hermes/...` 改成 `process.env.SCREENSHOT_DIR`
- [ ] `wsl-install.sh` 删 dev.sh 引用 + 加 create-dev-sh 步骤

**P1 进入条件**：P0 全 ✅

---

## P2 — 后端基础（PR 10-13）

### P2.1 PR 10：i18n helper

- [ ] `backend/src/common/i18n.ts` 存在
- [ ] 导出 `safeParse<T>(raw, fallback)` + `getLocalized(field, locale, fallbackChain?)` + `localeFallbackChain(locale)`
- [ ] `backend/src/common/i18n.spec.ts` 覆盖率 ≥95%
- [ ] `refactor/i18n-baseline.json` 清空（即 i18n drifts 已全部修）

### P2.2 PR 11：JSON.parse 替换

- [ ] 7 个 service 文件替换 13 个 JSON.parse 调用
- [ ] `feeding-advice.service.ts:96` 双解析修成单解析
- [ ] `ref-check.ts` 报 0 findings（project_policies.jsonb）

### P2.3 PR 12：昵称校验器

- [ ] `src/common/validators/text.ts` 单一来源
- [ ] 替换 3 处（`fish.service.ts` + `fish-tanks.service.ts`）
- [ ] 返回 `ErrorCode` enum

### P2.4 PR 13：测试覆盖

- [ ] 7 个新 spec：`preferences` / `user` / `location` / `cities` / `temperature` / `temperature-adjust` / `health`
- [ ] 全部 ≥80% 行覆盖
- [ ] `npm test` 全绿（含原有 7 个 spec）

**P2 进入条件**：P1 全 ✅

---

## P3 — 后端边界（PR 14-17）

### P3.1 PR 14：BaseRepository

- [ ] `src/common/repository/base.repository.ts`
- [ ] preferences / reminders / weather 切到 repository
- [ ] UserService 不再 import PreferencesService

### P3.2 PR 15：visualVariant 单源

- [ ] `src/common/mappings/visual-variant.ts` 单一来源
- [ ] 删 5 个内联映射（service）+ 3 个内联映射（migration）
- [ ] 加 mapping 单测
- [ ] `scripts/i18n-db-compliance.ts` 通过

### P3.3 PR 16：温度写者合一

- [ ] `src/temperature/temperature-state.ts` (BehaviorSubject)
- [ ] `WaterTemperatureService` 只写 TemperatureState，不写 DB
- [ ] `TemperatureAdjustService` 唯一 `prisma.fishTank.update({data:{temp}})`
- [ ] 扩 `temperature-adjust.service.spec.ts`：断言 water-temperature.service 无 prisma.fishTank.update

### P3.4 PR 17：删 `FishTank.temperature` 列

- [ ] `prisma/schema.prisma` 删 FishTank.temperature 字段 + 加 doc-comment
- [ ] 新 migration `<ts>_disambiguate_temp/`
- [ ] `KNOWN_PITFALLS.md` 加节："禁止重新引入双列"

**P3 进入条件**：P2 全 ✅

---

## P4 — 前端 i18n + mock → 真实 API + SWR（PR 18-22）

### P4.1 PR 18：fish growth-history 端点

- [ ] `fish-growth.controller.ts` + `fish-growth.service.ts` + spec
- [ ] `app/[locale]/growth/[fishId]/page.tsx` 改用 SWR

### P4.2 PR 19：stats 端点

- [ ] `stats/` 模块（controller + service + spec）
- [ ] 3 个端点：`/api/stats/summary` / `/api/stats/weekly` / `/api/achievements`
- [ ] `app/[locale]/stats/page.tsx` 改用 SWR

### P4.3 PR 20：i18n bug 修复

- [ ] `ja.json tankNames.My Tank` 添加
- [ ] `errors.tank_already_fresh` 三语都用 `{hours}`
- [ ] `i18n-baseline.json` 清空（drift 已修）
- [ ] `scripts/i18n-check.ts` 报 0 findings

### P4.4 PR 21：SWR + 删 mock

- [ ] `frontend/lib/swr/` 下 2 个 hook
- [ ] 删 `lib/api/mock.ts` 4 个 mock 端点
- [ ] `lib/api/api.ts` 删 URL 耦合 fallback (`if (path.includes('/stats')) return null as T;`)
- [ ] mock 留 `NEXT_PUBLIC_USE_MOCKS=1` env fallback

### P4.5 PR 22：parseLocalized helper

- [ ] `frontend/lib/i18n/parseLocalized.ts`
- [ ] 替换 `nameI18n.ts` + `reminders/page.tsx` inline parser

**P4 进入条件**：P3 全 ✅

---

## P5 — 前端 v3 类清理 + 死代码 + UI Kit 测试（PR 23-27）

### P5.1 PR 23：v3 布局/背景类（PR-A）

- [ ] 5 个文件清零 `water-*` / `sand-*` / `coral-*`
- [ ] `screenshot:compare` 差异 <0.1%

### P5.2 PR 24：v3 组件类（PR-B）

- [ ] `CapacityBar.tsx` / `GlassCard.tsx` 等清零 `.card` / `.label` / `badge-ideal|ok|poor`
- [ ] `screenshot:compare` 差异 <0.1%

### P5.3 PR 25：v3 按钮类（PR-C）

- [ ] 所有 `.btn-*` 文件清零
- [ ] `screenshot:compare` 差异 <0.1%

### P5.4 PR 26：死代码

- [ ] `useFishStore` / `useUIStore` 删除
- [ ] `useTankStore` 命运定（wire ≥2 consumer 或删）
- [ ] `lib/api/mock.ts` 删除（PR 21 已用 real API）

### P5.5 PR 27：UI Kit 测试

- [ ] 13 个 spec 全绿
- [ ] `npm test` 通过
- [ ] `jest.config.js` 或 `vitest.config.ts` 配好
- [ ] `scripts/harness.ts` 加 UI Kit test

**P5 进入条件**：P4 全 ✅

---

## 总进度跟踪（持续更新）

| Phase | PR 数 | 已完成 | 进度 |
|---|---|---|---|
| **P0** | 6 | 6 | ✅ 100% |
| **P1** | 3 | 0 | ⏳ 0% |
| **P2** | 4 | 0 | ⏳ 0% |
| **P3** | 4 | 0 | ⏳ 0% |
| **P4** | 5 | 0 | ⏳ 0% |
| **P5** | 5 | 0 | ⏳ 0% |
| **总计** | **27** | **6** | **22%** |

---

## 跨阶段不变量

每个 PR merge 前**必须**：

1. ✅ 该 PR 的所有 checklist item 已 ✅
2. ✅ `npm run harness:check:fast` exit 0
3. ✅ `npm run auth-check` 0 findings
4. ✅ `bash scripts/security-scan.sh` exit 0
5. ✅ Conventional Commits commit-msg 通过
6. ✅ PR 描述含 spec_link / evidence / risk / rollback

---

*CHECKLIST 由 harness-driven 自动维护（PR 5）。任何阶段门禁变更必须同步更新本文件 + SPEC.md。*

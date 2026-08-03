# Changelog

> **格式**：[Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)
> **版本**：[Semantic Versioning](https://semver.org/lang/zh-CN/)
> **Commit**：[Conventional Commits](https://www.conventionalcommits.org/zh-hans/)

**自动生成**：本文件由 [release-please](https://github.com/googleapis/release-please) 在 merge commit 时自动更新。
**手动覆盖**：仅在 release-please 行为异常时手动改；提交 message 引用 `chore(release): ...`。

---

## [Unreleased]

### Security 安全

- **PR 4** `feat(auth): add JWT authentication middleware`
  - 加 6 个 auth 模块文件（`public.decorator.ts` / `current-user.decorator.ts` / `jwt.strategy.ts` / `jwt-auth.guard.ts` / `auth.module.ts` / `auth.controller.ts`）
  - 全局 APP_GUARD → JwtAuthGuard 拦截所有写接口
  - 12 个 controller 加 @UseGuards / @Public 标记
  - `POST /api/auth/dev-token`（生产禁用）+ `GET /api/auth/verify`
  - `JWT_SECRET` / `JWT_EXPIRES_IN` / `DEV_TOKEN_USER_ID` 入 `.env.example`
  - 修复 universal_baseline.security.auth_required（**实施**）

- **PR 6** `chore(security): enable throttler and tighten CORS`
  - 加 `@nestjs/throttler` 全局限流 100 req/min/IP
  - `main.ts` cors:true → 基于 `ALLOWED_ORIGINS` 白名单
  - `KNOWN_ISSUES` 清空 — universal_baseline.security **100% 闭环**

### Added 新增

- **PR 1** `chore(harness): add universal baseline + repo-wide harness.yaml and gate scripts`
  - `harness.yaml`（两层：universal_baseline + project_policies + upgrade_triggers）
  - `scripts/harness.ts` 编排器
  - 8 个 check 脚本：ref-check / i18n-check / schema-check / auth-check / jsonb-strict-check / env-schema-check / no-console-check / security-scan
  - 跨会话 memory 入 `~/.claude/memory/`

- **PR 2** `ci: wire harness scripts (universal baseline + project-specific) and remove soft-fail lines`
  - `.github/workflows/ci.yml`（5 job：frontend / backend / harness-gate / universal-baseline / summary）
  - `.github/workflows/security-nightly.yml`（cron 每天 3 点）
  - 4 个 universal baseline 脚本：ts-prune / coverage / bundle-size / a11y-check

- **PR 3** `chore(husky): add pre-commit, pre-push, commit-msg gates`
  - `.husky/pre-commit`（lint-staged + harness:check:fast）
  - `.husky/pre-push`（harness:check:full）
  - `.husky/commit-msg`（Conventional Commits 正则）
  - `.lintstagedrc.json`
  - 加 `lint-staged@^15` devDep

- **PR 5** `docs(refactor): scaffold SPEC.md, CHECKLIST.md, PR template, CODEOWNERS, CHANGELOG`
  - `refactor/SPEC.md`（70 个 AC，6 主题）
  - `refactor/CHECKLIST.md`（6 阶段门禁）
  - `refactor/i18n-baseline.json`（i18n drift 快照）
  - `.github/PULL_REQUEST_TEMPLATE.md`（4 字段模板）
  - `.github/CODEOWNERS`（path-based 规则）
  - `CHANGELOG.md`（本文件）

### Documentation 文档

- **PR 1** `HARNESS_指南.md` —— harness 工程学习指南（13 文件 + 教学）
- **PR 4** `docs/refactor/lessons/p4-jwt-auth-migration.md` —— JWT 前端迁移
- **PR 6** `docs/refactor/lessons/p6-security-full-loop.md` —— security 全闭环记录
- **PR 3** `docs/refactor/lessons/p3-husky-hooks.md` —— husky 设计

### Fixed 修复

- **PR 4** 修复 universal_baseline.security.auth_required（**零认证漏洞**）
- **PR 6** 修复 `cors: true` 全开放（**任何网站可调 API**）
- **PR 6** 修复 sensitive `throttling`（无 API 限流 → 暴力破解风险）

---

## 版本演进（手动里程碑，由 release-please 接管后自动）

| 版本 | 日期 | 主要变更 | 关联 PR |
|---|---|---|---|
| (Unreleased) | 2026-07-31 | Harness 工程建立（24/70 AC 完成） | PR 1-6 |

---

*完整 commit history 见 [GitHub Commits](https://github.com/hnlisf/yoyu/commits/main)*
*规则来源：[refactor/SPEC.md](refactor/SPEC.md) + [refactor/CHECKLIST.md](refactor/CHECKLIST.md)*

# YoYu 测试报告 v10.2_20260723 — D1.2.2

## 测试概要
- 测试环境：sandbox（SQLite fixture + 静态审计 + backend build）
- 测试人员：Ada
- 代码基线：GitHub 5820f96e9842aa4cd6da38bdae517102d72a96f5
- 测试方法：规格驱动测试
- 禁止项遵守：未运行 Playwright / dev server

## 规格来源
- Kanban：t_ee600d23
- SOP-03：`/root/.hermes/projects/yoyu/sop/03_i18n_strict_validation.md` §2.2 D1.2.2
- BUG-V10.1.4-3：`/root/.hermes/projects/yoyu/bugs/BUG-V10.1.4-3-species-visualvariant-i18n-missing.md`
- 说明：`projects.json` 中架构与 PRD 路径当前不存在，已在看板评论记录；本任务规格由 task body + SOP-03 + BUG 根因文档完整覆盖。

## 交付实现
- `scripts/i18n-db-compliance.ts`：读取后端 `ALLOWED_VV`，SQLite JSON 校验，TSV 输出，合规 exit 0，违例 exit 1，执行错误 exit 2。
- `backend/src/migrations/fix-visualvariant-legacy.ts`：迁移 golden→yellow、striped→stripe、round→disc；SQLite 写前备份；重复执行修改 0 行。
- `backend/package.json`：新增 `test:i18n:db` 与 `migrate:visualvariant`。
- `.github/workflows/ci.yml`：在 `pull_request` 的 lint-and-typecheck job 中安装 backend 并执行 D1.2.2。

## 测试矩阵执行结果

| # | 规格项 | PASS/FAIL | 实际结果 |
|---|--------|-----------|---------|
| 1 | color ALLOWED | PASS | 真实 DB / 合规 fixture 均无违例 |
| 2 | pattern ALLOWED | PASS | 真实 DB / 合规 fixture 均无违例 |
| 3 | body ALLOWED | PASS | 真实 DB / 合规 fixture 均无违例 |
| 4 | golden/striped/round 负例 | PASS | exit 1；TSV 精确列出 3 个值、各 1 次及迁移建议 |
| 5 | 迁移后合规 | PASS | 三映射各执行 1 次；重跑合规脚本 exit 0 |
| 6 | 迁移幂等 | PASS | 第二次 `migrated=0`，exit 0 |
| 7 | unknown 值安全 | PASS | purpleish 不被迁移；合规脚本保持 exit 1 |
| 8 | 坏 JSON / 缺字段 | PASS | 分别输出 `<malformed-json>` 与 `<missing-or-non-string>`，exit 1 |
| 9 | npm 命令 | PASS | `npm run test:i18n:db` 可调用 |
| 10 | CI 接入 | PASS | PR/main lint job 执行 backend D1.2.2，非 `|| true` |
| 11 | backend build | PASS | `npm run build` exit 0 |
| 12 | GitHub commit 真实性 | PASS | REST 返回完整 SHA 5820f96e... 与 v10.1.4 merge message |

## 证据
- `evidence/t_ee600d23/01_legacy_fail.log`
- `evidence/t_ee600d23/02_migration.log`
- `evidence/t_ee600d23/03_post_migration_pass.log`
- `evidence/t_ee600d23/04_idempotent.log`
- `evidence/t_ee600d23/05_real_db_pass.log`
- `evidence/t_ee600d23/06_backend_build.log`

## 缺陷列表
无阻塞缺陷。

## 风险与边界
- CI 当前验证仓库内 `backend/prisma/dev.db`；生产/WSL DB 仍需部署时以其 `DATABASE_URL` 先跑迁移再校验。
- PostgreSQL 不是当前 Prisma datasource；脚本对非 `file:` URL 明确 exit 2，避免假 PASS。
- D1.2.1 与 D1.4.2 属于下游独立卡片，不在本卡伪报完成。

## 总结
- 规格项：12
- 通过：12
- 失败：0
- 通过率：100%
- D1.2.2：PASS

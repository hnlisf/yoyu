# YoYu Operations（运行手册）

> **本文件是 YoYu 项目的"日常运行手册"**——开发、调试、运维的标准步骤。
> 与 [DEPLOY.md](../DEPLOY.md)（部署）+ [HARNESS_指南.md](../HARNESS_指南.md)（harness 工程）共同构成项目完整文档体系。
>
> **维护说明**：由 harness-driven 自动维护（PR 9 创建）。任何运行步骤变更必须同步更新本文件。

---

## 1. 5 分钟上手（WSL 本地开发）

### 1.1 前置依赖

| 工具 | 版本 | 备注 |
|---|---|---|
| Node.js | ≥ 20.0.0 | 后端 Next.js 14 需要 Node 20 |
| npm | ≥ 10 | 自带 |
| Git | ≥ 2.30 | 任何新版本都行 |
| WSL | 推荐 Ubuntu 22.04 | Windows 用户用 Git Bash 也行 |

### 1.2 启动步骤

```bash
# 1. 克隆仓库
git clone https://github.com/hnlisf/yoyu.git
cd yoyu

# 2. 装 backend 依赖 + 初始化 DB
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed                   # 10 个鱼种 + 演示用户 + 演示鱼缸

# 3. 装 frontend 依赖
cd ../frontend
echo 'NEXT_PUBLIC_API_URL=http://localhost:3000' > .env.local
npm install

# 4. 启动两个 dev server（新开两个终端）
cd backend && npm run start        # → http://localhost:3000
cd frontend && npm run dev        # → http://localhost:3001
```

打开 http://localhost:3001 —— 系统已自动初始化演示鱼缸 + 一条「小金」金鱼。

### 1.3 验证

```bash
# 打开浏览器：http://localhost:3001
# 应看到：演示鱼缸 + 1 条金鱼 + 加热器开关

# 跑 harness 验证
cd /path/to/yoyu
npm run harness:check:fast
# 应输出：✅ All checks passed
```

---

## 2. 日常开发流

### 2.1 推荐工作流

```bash
# 1. 切到 dev 分支
git checkout dev

# 2. 写代码（任何文件）
# 自动触发 husky pre-commit 跑 lint-staged + harness:check:fast
# → 失败会在 commit 之前阻止

# 3. 提交
git add -A
git commit -m "feat(auth): add JWT middleware"   # 必须 Conventional Commits
# 失败：commit-msg hook 拒绝

# 4. 推送
git push
# 失败：pre-push hook 跑 harness:check:full（含 backend 测试）
# 成功：CI 5 job 全跑
```

### 2.2 常见命令

| 命令 | 用途 |
|---|---|
| `npm run harness:check:fast` | 3 个核心 check（ref / i18n / schema）|
| `npm run harness:check:full` | 含 backend + frontend 测试 |
| `npm run harness:report` | 所有 12 个 check（详细报告） |
| `npm run ref-check` | 单跑 ref 检查（13 JSON.parse + 23 v3 类 + 4 banned imports）|
| `npm run i18n-check` | 单跑 i18n 三语 parity |
| `npm run schema-check` | 单跑 Prisma schema 检查 |
| `npm run security-scan` | 单跑 4 类安全检查 |
| `npm run auth-check` | 单跑 13 controller 的写接口 Guard 检查 |
| `bash scripts/security-scan.sh` | 同上（手跑用）|

### 2.3 调试技巧

| 症状 | 排查 |
|---|---|
| backend 启动失败：`Cannot find module '@prisma/client'` | `cd backend && npx prisma generate` |
| 前端调 API 401 | `npm run dev-token` 拿新 token（待 PR 22 后才有）|
| Prisma migration 失败 | `cd backend && npx prisma migrate reset`（⚠️ 删数据）|
| harness 报"已知违规" | 检查 `harness.yaml → known_*` 数组——新违规才会阻断 |
| i18n 漂移 | `npm run i18n-check` 看漂移报告 |

---

## 3. 生产部署

### 3.1 部署前 Checklist

- [ ] `JWT_SECRET` 改 ≥32 字节强随机（`openssl rand -base64 32`）
- [ ] `ALLOWED_ORIGINS` 改实际前端域名（逗号分隔多环境）
- [ ] `DATABASE_URL` 切 PostgreSQL（`postgresql://user:pass@host:5432/yoyu`）
- [ ] `NODE_ENV=production`（自动禁用 dev-token）
- [ ] `harness:check:full` 在 CI 全绿
- [ ] backend `.env` 不进 git（.gitignore 已配）

### 3.2 Docker 化（推荐）

参见 `backend/Dockerfile` + `frontend/Dockerfile`（待 P5 后续补——本指南只列思路）

### 3.3 监控 + 日志

- 后端：当前无结构化日志（PR 5 引入 pino 后用 `pino.logger.xxx()`）
- 健康检查：`GET /api/health`（当前只回 `{status:'ok'}`——P3 后续接 Prisma ping）
- 错误追踪：未来可接 Sentry

---

## 4. 紧急操作

### 4.1 紧急跳过 harness

```bash
# 紧急 commit 跳过所有 hook
git commit --no-verify -m "hotfix: ..."

# 紧急 push 跳过 pre-push hook
git push --no-verify

# ⚠️ 警告：用 `--no-verify` 后必须在合并前补一次常规 commit
```

### 4.2 紧急回滚

```bash
# 找到要回滚的 commit
git log --oneline -10

# 用 revert（推荐）—— 保留历史
git revert <commit-hash>
git push

# 或硬回滚（⚠️ 慎用）
git reset --hard <commit-hash>
git push --force
```

### 4.3 数据库紧急备份

```bash
# 备份当前 dev.db
cp backend/prisma/dev.db backend/prisma/dev.db.bak.$(date +%Y%m%d)

# 恢复
cp backend/prisma/dev.db.bak.YYYYMMDD backend/prisma/dev.db
```

生产环境：参考云服务商的 volume snapshot（Railway / Render / Fly.io 都支持）。

---

## 5. 故障排查

### 5.1 CORS 错误

`cors: true` 已被 PR 6 替换为 ALLOWED_ORIGINS 白名单。

排查：
```bash
# 检查 backend 启动日志
cd backend && npm run start
# 应输出：CORS allowed origins: http://localhost:3001

# 临时调试：把所有 origins 加进去
ALLOWED_ORIGINS=* npm run start   # ⚠️ 仅 dev 调试
```

### 5.2 JWT 401 错误

```bash
# 拿 dev token
curl -X POST http://localhost:3000/api/auth/dev-token

# 用 token 测
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/fish-tanks?userId=demo-user
```

### 5.3 harness 检查有"新违规"

```
🔴 [新] src/foo.ts:42  新增 JSON.parse( 调用

解决：删该 JSON.parse，改用 src/common/i18n.ts 的 safeParse()
```

### 5.4 Prisma migration 卡住

```bash
# 检查 migration 状态
cd backend && npx prisma migrate status

# 重新应用（生产慎用）
npx prisma migrate resolve --rolled-back 20260612011317_init
npx prisma migrate deploy
```

---

## 6. 高级话题

### 6.1 添加新 fish species

1. 编辑 `backend/prisma/seed.ts` 加新 species 对象
2. `cd backend && npm run db:seed` 重新 seed
3. （可选）删 `prisma/dev.db` 重新 migrate

### 6.2 修改 harness 规则

`harness.yaml` 是唯一真相源。修改流程：
1. 改 `harness.yaml`（加新 rule / 改阈值）
2. 跑 `npm run harness:check:fast` 验证
3. 改 commit message 引用 `lessons: <link>`（`upgrade_triggers.harness_yaml_changed` 要求）
4. 至少 1 个 reviewer 确认

### 6.3 跨 harness 工程的扩展

想加新 check 脚本（任何 type）：
1. 写 `scripts/{name}.ts` 或 `.sh`
2. 在 `harness.yaml → scripts` 注册
3. 加进 `harness:check:fast` 或 `:full` 列表
4. 写 lessons 文档

---

*文件路径：`docs/OPERATIONS.md`*
*关联：[DEPLOY.md](../DEPLOY.md) + [HARNESS_指南.md](../HARNESS_指南.md) + [KNOWN_PITFALLS.md](KNOWN_PITFALLS.md)*
*维护：PR 9 创建*

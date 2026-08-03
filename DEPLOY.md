# YoYu 部署指南（v10.2 更新版）

> **本文件是历史 v5.0 部署指南的"清理重置版"**。
> - 旧 `DEPLOY.md` 引用了 `hnlisf/fishgrow`（重命名前的旧仓库名）和 Vercel/Railway free tier 方案
> - 现在项目已重命名为 `hnlisf/yoyu`，主推 **WSL 本地开发** + 可选云部署
> - 详细日常运行步骤见 [docs/OPERATIONS.md](docs/OPERATIONS.md)
>
> **维护说明**：本文件由 harness-driven 维护（PR 9）。任何部署相关变更必须同步更新本文件 + OPERATIONS.md。

---

## 推荐：WSL 本地开发（首选）

参见 [docs/OPERATIONS.md](docs/OPERATIONS.md) 的 5 分钟上手。

## 架构总览

```
┌──────────────────┐         ┌──────────────────────┐
│  Next.js frontend│ ──API──▶│  NestJS backend      │
│  localhost:3001  │         │  localhost:3000      │
│  + SQLite (NeDB)  │         │  + Prisma + SQLite   │
└──────────────────┘         └──────────────────────┘
```

- **frontend**：Next.js 14 App Router + next-intl + SWR + Zustand
- **backend**：NestJS 11 + Prisma 6 + JWT + Throttler
- **database**：SQLite（开发用 `prisma/dev.db`；生产建议 PostgreSQL）
- **Harness 自动化**：`harness.yaml` + 8 个 check 脚本 + `.github/workflows/ci.yml`

## 关键环境变量

| 变量 | 默认 | 必填 | 说明 |
|---|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | ✅ | Prisma 连接字符串（生产改 PostgreSQL） |
| `PORT` | `3000` | ❌ | backend 端口 |
| `JWT_SECRET` | `dev-only-...` | ✅ | JWT 签名密钥（生产 ≥32 字节强随机） |
| `JWT_EXPIRES_IN` | `24h` | ❌ | Token 有效期（生产建议 1h + refresh） |
| `DEV_TOKEN_USER_ID` | `demo-user` | ❌ | dev-token 默认 userId |
| `ALLOWED_ORIGINS` | `http://localhost:3001` | ✅ | CORS 白名单（生产必须改） |
| `NODE_ENV` | `development` | ❌ | dev-token 生产禁用（`production` 时返回 404） |

## 生产部署（云端）— 已废弃

⚠️ **早期 Vercel + Railway free-tier 方案已废弃**（仓库 2026-06 改名 `hnlisf/fishgrow` → `hnlisf/yoyu` 之前规划）。

如确需云部署，建议：
- **backend**：Dockerize → 任何支持 Node + SQLite volume 的 PaaS（Railway / Render / Fly.io）
- **frontend**：Vercel（Next.js 一等公民）
- **database**：生产改 PostgreSQL（Prisma 切 datasource 即可）

具体配置见 [docs/OPERATIONS.md](docs/OPERATIONS.md) §3「生产部署」。

## CI/CD

`.github/workflows/`：
- `ci.yml`：PR / push 触发，5 job（frontend / backend / harness-gate / universal-baseline / summary）
- `security-nightly.yml`：每天凌晨 3 点跑，深度安全扫描（不阻断）

---

*文件路径：`DEPLOY.md`（根目录）*
*关联：[docs/OPERATIONS.md](docs/OPERATIONS.md) + [.harness.yaml](harness.yaml)*
*维护：PR 9*

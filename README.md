# 🐟 YoYu（鱼成长）

**虚拟养鱼养成游戏** — 选鱼种、建鱼缸，看小鱼从鱼苗长到成鱼；按时喂食，天气感知，城市偏好，游动动画，一手掌握。

---

## ✨ 核心功能（10 大特性）

| # | 功能 | 说明 |
|---|------|------|
| 1 | 🐠 **鱼种库 + 自定义鱼种** | 内置 10 种默认鱼，支持中/英/日多语言；用户可提交自定义鱼种 |
| 2 | 🫧 **鱼缸 + 鱼只 CRUD + 4 阶段成长** | 鱼缸/鱼只完整管理；4 成长阶段：鱼苗 → 幼鱼 → 亚成 → 成鱼 |
| 3 | 🍤 **喂食 + 状态机 + 时序** | 一键喂食，JS 状态机动画（IDLE→FEEDING→EATING→DONE），成长百分比动态计算 |
| 4 | 🐟 **鱼游动动画（v5 新增）** | CSS offset-path + 8 条贝塞尔曲线，≤20 条全动画，21-50 条 50%，50+ 降级浮动 |
| 5 | 🌦️ **天气联动（v5 新增）** | Open-Meteo 免费 API，城市级天气缓存（30min TTL），4 套天气背景 CSS |
| 6 | 🏙️ **城市偏好设置（v5 新增）** | 我的 → 偏好 → 城市，搜索 + 快捷选择，未设城市自动降级隐藏天气块 |
| 7 | ⏰ **智能提醒** | 按鱼种喂食频率和鱼缸尺寸自动派生提醒，支持完整 CRUD |
| 8 | 🌐 **多语言 UI** | 中/英/日三语，`next-intl` 集成，鱼名按语言从 DB JSONB 字段读取 |
| 9 | 🎨 **v4 液态玻璃深海蓝 UI** | Glassmorphism 玻璃态 + `#0a1f2e` 深海军蓝 + `backdrop-filter` 模糊，12 token 主题系统 |
| 10 | 📊 **数据可视化** | 生长曲线（鱼只重量/阶段时间线）+ 喂食统计（频次/间隔分布） |

---

## 🛠️ 技术栈

| 类别 | 选型 |
|------|------|
| **前端** | Next.js 14（App Router）、React 18、Tailwind CSS、next-intl、Zustand |
| **后端** | NestJS 11、Prisma ORM、SQLite |
| **数据库** | SQLite 3.x（开发）/ PostgreSQL（生产预留） |
| **测试** | Jest（后端）+ Next.js 组件测试 |
| **CI** | GitHub Actions（lint + test + build） |

---

## 📋 环境要求

| 项目 | 最低版本 / 要求 | 备注 |
|------|----------------|------|
| **Node.js** | `>= 20.0.0` | 代码使用 `--target ES2023` + `nodenext` 模块系统 |
| **npm** | `>= 10` | `package-lock.json` 为 `lockfileVersion 3` |
| **Git** | `>= 2.30` | 支持新版 git 协议与 worktree |
| **磁盘** | `>= 2 GB 可用` | 前后端 `node_modules` 合计约 500 MB+ |
| **内存** | `>= 2 GB` | 后端约 100 MB，前端 dev 模式约 500 MB |
| **端口** | `3000`（后端）+ `3001`（前端）必须空闲 | 启动前确认无占用 |
| **SQLite** | 3.x | Prisma 内置驱动，**无需**独立安装 |
| **操作系统** | macOS / Linux / Windows（推荐 WSL） | WSL 在 Windows 上获得最佳兼容性 |

> ⚠️ **首次部署必须创建 `backend/.env` 文件**（参考 `backend/.env.example`）。
> `prisma generate` 在没有 `.env` 时会校验 `DATABASE_URL` 失败导致编译错误。
> 解决：`cp backend/.env.example backend/.env`

快速自检：

```bash
node --version    # 应输出 v20.x 或更高
npm --version     # 应输出 10.x 或更高
ss -tlnp | grep -E ':3000|:3001'   # 端口应空闲
```

---

## 🚀 WSL 本地开发（5 分钟上手）

```bash
# 克隆仓库
git clone https://github.com/hnlisf/yoyu.git
cd yoyu

# 后端
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed                # 10 个鱼种 + 演示用户 + 演示鱼缸
npm run start                  # → http://localhost:3000
# Swagger: http://localhost:3000/api/docs

# 前端（新开终端）
cd ../frontend
npm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:3000' > .env.local
npm run dev                    # → http://localhost:3001
```

打开 http://localhost:3001，系统已自动初始化一个演示鱼缸，里面有一条名为「小金」的金鱼。

---

## 📁 项目结构

```
yoyu/
├── backend/                         # NestJS + Prisma + SQLite 后端
│   ├── src/                         # 模块：fish-species, fish-tanks, fish,
│   │   │                            #   feeding-advice, location, weather,
│   │   │                            #   reminders, preferences (v5)
│   ├── prisma/                      # schema.prisma + migrations + seed.ts
│   └── test/                        # e2e 集成测试
├── frontend/                        # Next.js 14 + Tailwind + next-intl 前端
│   ├── src/app/[locale]/            # 11 页面：
│   │   │                            #   首页 / 鱼种 / 鱼缸+鱼缸详情 / 成长 /
│   │   │                            #   统计 / 个人中心 / 提醒 / 天气 /
│   │   │                            #   fish-demo / fish-only / ui-kit-demo
│   └── messages/                    # 多语言：zh.json, en.json, ja.json
├── docs/                            # 项目文档
│   ├── v5.0-deployment-guide.md     # 生产部署完整指南
│   ├── v5.0_PR_Description.md       # v5.0 发布详情
│   └── phase2-implementation.md     # Phase 2 品牌升级说明
├── .github/workflows/ci.yml         # CI：lint + test + build
└── README.md                        # 本文件
```

---

## 📊 API 概览

**Base URL**：`http://localhost:3000`，Swagger 文档：`/api/docs`。所有接口支持 `?lang=zh|en|ja`。

| Method | Path | 说明 |
|--------|------|------|
| GET    | `/api/fish-species`         | 鱼种列表 |
| GET    | `/api/fish-species/:id`     | 鱼种详情 |
| POST   | `/api/fish-species/custom`  | 创建自定义鱼种 |
| GET    | `/api/fish-tanks?userId=`   | 鱼缸列表 |
| POST   | `/api/fish-tanks`           | 创建鱼缸 |
| GET    | `/api/fish-tanks/:id`       | 鱼缸详情 |
| PUT    | `/api/fish-tanks/:id`       | 更新鱼缸 |
| DELETE | `/api/fish-tanks/:id`       | 删除鱼缸 |
| POST   | `/api/fish-tanks/:id/tick`  | 触发鱼缸成长 tick |
| GET    | `/api/fish?tankId=`         | 鱼只列表 |
| POST   | `/api/fish`                 | 创建鱼只 |
| GET    | `/api/fish/:id`             | 鱼只详情 |
| PUT    | `/api/fish/:id`             | 更新鱼只 |
| DELETE | `/api/fish/:id`             | 删除鱼只 |
| POST   | `/api/fish/:id/feed`        | 喂食（自动校验频率） |
| GET    | `/api/feeding-advice?userId=` | 基于天气的喂食建议 |
| GET    | `/api/weather?lat=&lon=`    | 当前天气（缓存 30 分钟） |
| GET    | `/api/user/preferences`     | 获取用户偏好 **（v5 新增）** |
| PUT    | `/api/user/preferences`     | 更新用户偏好（含城市）**（v5 新增）** |
| GET/POST/PUT/DELETE | `/api/reminders` | 提醒事项 CRUD |
| POST   | `/api/reminders/ensure-defaults` | 自动派生默认提醒 |

---

## 🧪 测试

```bash
cd backend && npm test         # Jest 单元/集成测试
cd frontend && npm test        # Next.js 组件测试
```

覆盖：鱼种 CRUD、喂食频率校验、提醒派生、天气 URL 构造、Seed 幂等性、locale-prefix 路由、语言切换器、城市偏好 API。

---

## 🌐 生产部署（可选）

完整 Vercel + Railway + PostgreSQL 部署指南见 [`docs/v5.0-deployment-guide.md`](./docs/v5.0-deployment-guide.md)。关键要点：

- **后端 Railway**：挂载 Volume 到 SQLite 目录，设置 `DATABASE_URL=file:./prisma/dev.db`
- **前端 Vercel**：设置 `NEXT_PUBLIC_API_URL=<Railway 后端 URL>`
- **公网/局域网**：`frontend/.env.local` 配置 `NEXT_PUBLIC_API_URL=http://<本机 IP>:3000`
- 开发阶段推荐 WSL 本地运行，无需云服务

---

## 🔒 开发工作流（铁律）

本项目采用 **dev / main 双分支工作流**，严禁直接推 main：

```
1. 所有新代码在 dev 分支开发：
   git checkout dev

2. Commit 规范（Conventional Commits）：
   feat/fix/docs/chore/refactor/test

3. 推送 dev：
   git push origin dev

4. 等待 Ada 验收通过

5. 创建 PR（dev → main）：
   gh pr create --base main --head dev --title "..." --body "..."

6. 老板 review + merge

7. 同步 dev 到 main 最新：
   git checkout dev && git pull origin main && git push origin dev
```

**main 分支只接受通过 PR 合并的代码。** dev 分支所有 commit 必须是英文 Conventional Commits 格式。

---

## 📝 许可证

本项目采用 [MIT](./LICENSE) 许可证。

---

## 🤝 贡献

欢迎 PR！提交规范：Conventional Commits（`feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`）。

---

## 📮 联系方式

- **GitHub 仓库**：https://github.com/hnlisf/yoyu
- **问题反馈**：通过 GitHub Issues 提交
- **部署详细文档**：[docs/v5.0-deployment-guide.md](./docs/v5.0-deployment-guide.md)

---

> 本文档由 YoYu 6 智能体研发团队维护，最后更新于 2026-06-21

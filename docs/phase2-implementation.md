# Phase 2 实现说明 — FishGrow → YoYu 品牌升级

> 分支: `feat/phase2-rebrand`  
> 状态: ✅ 完成  
> 任务: t_cf1258dc  
> 执行人: 研发经理 Linus

---

## 概览

将 **FishGrow** 品牌升级为 **YoYu (鱼鱼)**，配合首页视觉改版、全端响应式适配、顺手修复后端 gap。

### 三语品牌对照

| 语言 | 原名 | 新名 |
|------|------|------|
| 中文 | 鱼成长 | **鱼鱼** |
| 英文 | FishGrow | **YoYu** |
| 日文 | フィッシュグロウ | **ヨユ** |

### 设计理念

YoYu = "游鱼" + "游悠" — 体现鱼儿在水中从容游弋的意境，结合 Glassmorphism 玻璃态视觉风格和深海蓝调色板。

---

## 4 次 Commit 分解

### Commit 1 (`f80fbd7`) — 品牌改名

**范围**: 全局搜索替换 + i18n 资源更新

| 文件 | 改动 |
|------|------|
| `frontend/package.json` | `fishgrow-frontend` → `yoyu-frontend` |
| `frontend/src/messages/zh.json` | 鱼成长→鱼鱼, 欢迎文案, aboutDesc |
| `frontend/src/messages/en.json` | FishGrow→YoYu, Welcome, aboutDesc |
| `frontend/src/messages/ja.json` | FG→ヨユ, ようこそ, aboutDesc |
| `frontend/src/app/[locale]/layout.tsx` | title/description → YoYu · Liquid Glass |
| `frontend/public/favicon.ico` | 更新图标 |
| `frontend/next.config.js`, `backend/README.md` | 引用更新 |

**向后兼容**: DB schema (`fishgrow.tankId`)、localStorage key 不动。

---

### Commit 2 (`926be58`) — 首页改版

新增 4 个独立组件替代内联 JSX：

| 组件 | 类型 | 职责 |
|------|------|------|
| `HomeHero` | Server | Logo + 品牌标语 + CTA |
| `RecommendedFish` | Server | 推荐鱼种 3 Card 网格 |
| `QuickEntries` | Server | 4 入口（鱼缸/鱼种/统计/我的） |
| `Announcement` | Client | 公告横幅 + useState 关闭 |

**新增 Tailwind Token**:
- `brand-primary`: `#00C9DB` (cyan-400)
- `brand-accent`: `#7F5AF0` (purple)

---

### Commit 3 (`6db35bd`) — 三端响应式

5 页面 × 3 断点 (`sm≥640`, `xl≥1280`)：

| 页面 | Mobile (<640) | Pad/Desktop (≥640) | XL (≥1280) |
|------|:---:|:---:|:---:|
| 首页 | 1列 | 中心布局 | `max-w-7xl` |
| 鱼缸列表 | `grid-cols-2` | `grid-cols-2` | `grid-cols-3` |
| 鱼缸详情 | `gap-4` | `gap-6` | `gap-8` |
| 统计页 | `grid-cols-3` | `grid-cols-6` | `grid-cols-6` |
| 个人中心 | `grid-cols-2` | `grid-cols-3` | `grid-cols-4` |

**全局**: `layout.tsx` → `overflow-x-hidden` 消除所有跨页面水平滚动。

---

### Commit 4 (`faf7d04`) — 后端 Gap 修复

**MBE.1 — 鱼缸名唯一性校验**:
- `fish-tanks.service.ts`: `create()` 前检查 `findByCriteria({ name })` 
- 重名 → `409 ConflictException` 返回 `{ error: 'DUPLICATE_TANK_NAME', message: '你已经有一个叫「xxx」的鱼缸了' }`

**MBE.2 — 404 有 body**:
- 新增 `common/all-exceptions.filter.ts`: `AllExceptionsFilter`
- 404 → `{ error: 'NOT_FOUND', message: '资源不存在' }`
- 500 → `{ error: 'INTERNAL_ERROR', message: '服务器内部错误' }`
- `main.ts` 注册 `useGlobalFilters`

---

## 技术决策

1. **不碰 DB schema** — `fishgrow.*` 字段名保留，避免 migration 成本
2. **i18n 三语同步** — zh/en/ja 全部更新，key 不变
3. **组件化首页** — 4 个独立组件 vs inline JSX，便于复用和维护
4. **sm/xl 断点** — 不用 md，因为统计页和个人中心需要更大空间切换
5. **全局 filter 处理 404** — DRY，不在每个 controller 重复
6. **Service 层查重** — 比 DB unique index 更灵活，错误信息更语义化

---

## 自检截图

Playwright 自动生成 18 张截图，覆盖：

- **响应式**: 5 页面 × 3 视口 (mobile 414×896, pad 768×1024, desktop 1440×900) = 15 张
- **改名验证**: 首页 / 个人中心 / 鱼缸 (3 张)

截图存档于 artifact workspace，质量评估: Mobile 9/10, Desktop 8.5/10。

---

## GitHub

- 分支: [`feat/phase2-rebrand`](https://github.com/hnlisf/fishgrow/tree/feat/phase2-rebrand)
- 4 commits, 20+ files changed
- TypeScript 类型检查通过, 后端编译通过

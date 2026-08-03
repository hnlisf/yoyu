# PR 4 — JWT 认证迁移说明（P0 §auth）

> **受众**：前端开发者 + 后续维护者
> **状态**：PR 4 已合并。**所有未带 Bearer Token 的写接口会返回 401**。
> **后果**：现有前端 `fetch()` 调用需要先获取 token。

---

## 为什么做这个改动？

之前后端**完全没有任何鉴权**。任何人加 `?userId=demo-user` 就能：

- 创建/删除别人的鱼缸
- 修改别人鱼缸的水温、加热器
- 喂养别人的鱼
- 修改别人的偏好（城市、收藏）
- 增删别人的提醒

PR 4 引入 JWT 鉴权，关闭这个洞。

---

## 现有接口的鉴权状态

### 公开（无需 token，原行为不变）

| 路由 | 用途 |
|---|---|
| `GET /api/health` | 健康检查（监控用） |
| `GET /api/cities` | 城市列表（天气选择器） |
| `GET /api/location` | IP 定位（首次访问） |
| `GET /api/weather?...` | 天气数据（首屏） |
| `GET /api/fish-species` | 鱼种列表 |
| `GET /api/fish-species/:id` | 鱼种详情 |
| `POST /api/auth/dev-token` | 签发开发 token（**生产返回 404**） |

### 受保护（必须 `Authorization: Bearer <token>`，否则 401）

**所有写接口** + 所有用户私有读接口（鱼缸/鱼/提醒/偏好/喂食建议/用户资料）。

---

## 前端迁移指南

### 步骤 1：拿到 token

```ts
// 在前端 fetch 拦截器启动时调用一次
const res = await fetch('/api/auth/dev-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'demo-user' }),  // 可选；不传则用 DEV_TOKEN_USER_ID
});
const { accessToken } = await res.json();
```

### 步骤 2：在 fetch 拦截器加 Authorization 头

```ts
// lib/api.ts 或类似
const api: typeof fetch = async (url, init = {}) => {
  const token = localStorage.getItem('accessToken');  // 缓存 token
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};
```

### 步骤 3：处理 401 重新登录

```ts
if (res.status === 401) {
  // token 过期或无效 — 重新拿 token
  await refreshToken();
  return api(url, init);  // 重试
}
```

### 步骤 4：去掉 query `?userId=`（可选）

服务端的 `userId` 现在优先从 token 取，body 里的 `userId` 被忽略。**前端可以保留 query**（无害），但建议移除——

**未来 PR 会进一步收紧**：完全删掉 query 里的 userId，只用 token。

---

## Token 生命周期

| 项 | 默认 | 改位置 |
|---|---|---|
| `JWT_SECRET` | `dev-only-change-me-in-production-please-use-a-real-secret` | `backend/.env` |
| `JWT_EXPIRES_IN` | `24h` | `backend/.env` |
| `DEV_TOKEN_USER_ID` | `demo-user` | `backend/.env` |

**生产环境必须**：
1. 把 `JWT_SECRET` 改成 ≥32 字节的强随机字符串
2. 把 `JWT_EXPIRES_IN` 改短（比如 `1h`）
3. 实现 `/api/auth/refresh-token` 端点（**后续 PR**，当前 dev-token 已具备基础能力）

---

## 已知 / 后续工作

### 当前 PR 4 没做的事（后续 PR 跟进）

1. **前端 fetch 拦截器集成**：当前 frontend 还在用裸 `fetch()` —— 调用会 401。需前端配合改动。
2. **`changeWater` 等仍用 `body.userId`**：PR 4 只示范了 `fish-tanks POST` 用 `@CurrentUser('id')`，其他写方法仍依赖 body。后续 PR 全部迁移到 `@CurrentUser`。
3. **dev-token 端点生产禁用**：已实现（`NODE_ENV=production` 返回 404），但 CI 应配 `NODE_ENV`。
4. **Refresh token**：当前 token 24h 过期后必须重新登录。后续 PR 加 `/api/auth/refresh`。

### 安全债追踪（已在 `harness.yaml` → `pr1_status.known_security_issues`）

- ⏳ `backend/src/main.ts:8` — `cors: true` 全开放（P0 PR 6 修）
- ⏳ 前端 fetch 拦截器未集成 token（需前端 PR）

---

*文档：PR 4 lessons.md — harness-driven 自动生成*

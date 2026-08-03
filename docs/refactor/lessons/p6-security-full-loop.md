# PR 6 — Universal Baseline.security 全闭环达成

> **状态**：✅ **完成**
> **影响**：universal_baseline.security 5 类规则全部从"声明"变成"实施"

---

## 5 类规则实施情况

| 规则 | 规则出处 | 实施 PR | 状态 |
|---|---|---|---|
| **secrets_scan** | PR 2 | PR 2 (`scripts/security-scan.sh`) | ✅ |
| **dep_audit** | PR 2 | PR 2 (CI `npm audit --audit-level=high`) | ✅ |
| **cors_check** | **PR 6** | **PR 6**（main.ts + security-scan.sh 注释过滤）| ✅ |
| **auth_required** | PR 4 | PR 4（JWT + JwtAuthGuard 全局）| ✅ |
| **rate_limit** | **PR 6** | **PR 6**（ThrottlerModule 全局 100 req/min/IP）| ✅ |

**universal_baseline.security 100% 实施**。

---

## PR 6 关键技术变更

### 1. CORS 修复（main.ts:8）

```ts
// 之前 — 任何网站都能调 API
const app = await NestFactory.create(AppModule, { cors: true });

// PR 6 后 — 显式白名单
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3001')
  .split(',').map(s => s.trim()).filter(Boolean);
const app = await NestFactory.create(AppModule, {
  cors: { origin: allowedOrigins, credentials: true, methods: [...] },
});
```

**为什么之前是漏洞**：`cors: true` 让 NestJS 设置 `Access-Control-Allow-Origin: *`，**任何网站** 都能调 API。攻击者只需诱导用户访问恶意页面 → 页面 JS 直接 fetch yoYu API → 拿到用户数据。

**生产部署必做**：把 `.env` 的 `ALLOWED_ORIGINS` 改成实际前端域名（含 staging / preview 环境用逗号分隔）。

### 2. Throttler 启用

```ts
// app.module.ts
ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
// 注册全局 APP_GUARD
{ provide: APP_GUARD, useClass: ThrottlerGuard },
```

**行为**：单 IP 60 秒窗口内最多 100 请求。超限 → `429 Too Many Requests`。

**Guard 链顺序**（NestJS 按注册顺序）：
```
HTTP Request
  → ThrottlerGuard  (rate limit check)
  → JwtAuthGuard    (auth check)         ← AuthModule APP_GUARD
  → Controller Method
```

防止暴力破解 / API 滥用 / 撞库攻击。

### 3. KNOWN_ISSUES 清空

- `harness.yaml → pr1_status.known_security_issues: []`
- `scripts/security-scan.sh → KNOWN_ISSUES=()`

从此 `security-scan.sh` 是**零容忍模式**——任何新发现的 `cors: true`（或硬编码 secret）立即阻断。

### 4. security-scan.sh 升级

加了注释行过滤：
```bash
| grep -vE ':[[:space:]]*//' \
| grep -vE ':[[:space:]]*\*' \
```

避免 main.ts 的注释 `// ── PR 6 修复：cors: true →...` 被误判为违规。

---

## 验证清单

- [x] `bash scripts/security-scan.sh` —— 5 节全 ✅（无 cors / 无 secret / 无敏感文件 / 无新增依赖漏洞）
- [x] `npm run auth-check` —— 0 未保护写方法
- [x] `npm run harness:check:fast` —— 3/3 pass
- [x] `npm run harness:report` —— 12/15 pass（3 expected failures 是 backend deps 未装）
- [x] `harness.yaml → pr1_status.known_security_issues` —— 已清空 `[]`

---

## 后续工作（P1+ 跟进）

虽然 universal_baseline.security 完成，但 security 领域仍有 P1+ 待办：

1. **rate_limit 细粒度**（P6.1+）
   - 当前 `100/min/IP` 对所有接口一视同仁
   - 高价值端点（login / dev-token）应单独更严：例如 `10/min/IP`
2. **Refresh token**（P1 PR 9 follow-up）
   - 当前 token 24h 后必须重新登录
   - 实现 `/api/auth/refresh`
3. **Frontend fetch 拦截器集成**（PR 4 后续）
   - 前端目前还在用裸 `fetch()`，会被 server 401
   - 详见 `docs/refactor/lessons/p4-jwt-auth-migration.md`

---

*文档：PR 6 lessons.md — harness-driven 自动生成*

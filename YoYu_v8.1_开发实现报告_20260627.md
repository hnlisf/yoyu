# YoYu v8.1 开发实现报告

> **日期**: 2026-06-27 | **执行人**: Linus | **任务**: t_7b4880ca
> **基线**: dev HEAD=40b45b5 (v8.0) → 3 次修复 → dev HEAD=fd88e26
> **分支**: dev（不合并 main，不打 tag）
> **状态**: ✅ 3/3 修复完成，已推送 GitHub

---

## 修复清单

### P0-1: UI-1 鱼缸间距 REGRESSION — flex-none → flex-1

**问题**: v8.0 的 d3a6c2e commit 将 `flex-1 min-h-0` 改为 `flex-none min-h-0`，导致 mobile 端 swim-stage 退化为 34px (4.2% vh)，屏幕 50% 为空白。

**文件**: `frontend/src/app/[locale]/tanks/[id]/page.tsx:224`

```diff
-      {/* Main stage — flex-none for natural height, no 60vh cap */}
-      <div className="flex-none min-h-0 flex flex-col sm:flex-row gap-0">
+      {/* Main stage — flex-1 for adaptive height, no 60vh cap */}
+      <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-0">
```

**Commit**: `0df0dcc`

**验证**:
- grep 确认: line 224 已变为 `flex-1 min-h-0` ✅
- 预期效果: swim-stage 占剩余空间，header + stage + drawer 填充全屏

---

### P0-2: BUG-1 404 恢复路径死循环 — 复用现有 tank

**问题**: v8.0 的 a9621af commit 修复了 4 类错误分类，但 "404→清 tankId→重新创建" 恢复路径上，POST `/api/fish-tanks` 硬编码 `name: '我的鱼缸'` 撞 DUPLICATE_TANK_NAME 死循环。

**方案**: 采用优选方案① — 创建前先 GET `/api/fish-tanks?userId=demo-user`，如已有 tank 则直接复用。

**文件**: `frontend/src/app/[locale]/species/page.tsx:117-143`

```diff
     if (!tankId) {
       try {
+        // Try to reuse existing tank first
+        const existing = await api<{ id: string }[]>('/api/fish-tanks?userId=demo-user');
+        if (existing && existing.length > 0) {
+          tankId = existing[0].id;
+          localStorage.setItem(STORAGE_KEY, tankId);
+        } else {
           const res = await fetchWithRetry('/api/fish-tanks', {
             method: 'POST',
             body: JSON.stringify({ userId: 'demo-user', name: '我的鱼缸' }),
           });
           // ... existing error handling ...
+        }
         // Set as default tank for HomeRedirect
         try { ... }
```

**Commit**: `687662b`

**验证**:
- grep 确认: line 120 `api('/api/fish-tanks?userId=demo-user')` 已添加 ✅
- API 实测: `GET /api/fish-tanks?userId=demo-user` → 200，返回 tank `febf1578-...` ✅
- 逻辑: 先查后建，已有则不建，避免 DUPLICATE_TANK_NAME

---

### P0-3: BUG-4 城市切换水温 — 补 userId 参数

**问题**: v8.0 的 40b45b5 commit 实现了方案B前端两跳，但 `loadWeather()` 调 `/api/user/preferences` 缺 `userId` 参数，导致 400 错误，city 切换后水温不更新。

**修复**:
1. 添加 `const USER_ID = 'demo-user';` (line 20)
2. API 调用补 userId: `` `/api/user/preferences?userId=${USER_ID}` `` (line 75)

**文件**: `frontend/src/app/[locale]/tanks/[id]/page.tsx`

```diff
+const USER_ID = 'demo-user';
+
 interface PageProps {
```

```diff
-      const pref = await api<{ city?: string }>('/api/user/preferences');
+      const pref = await api<{ city?: string }>(`/api/user/preferences?userId=${USER_ID}`);
```

**Commit**: `fd88e26`

**验证**:
- grep 确认: line 75 `userId=${USER_ID}` 已添加 ✅
- grep 确认: line 20 `const USER_ID = 'demo-user'` 已添加 ✅
- API 实测: `GET /api/user/preferences?userId=demo-user` → 200 ✅

---

## Commit 历史

| # | SHA | 内容 |
|---|-----|------|
| 1 | 0df0dcc | fix: UI-1 鱼缸间距REGRESSION |
| 2 | 687662b | fix: BUG-1 404恢复路径死循环 |
| 3 | fd88e26 | fix: BUG-4 城市切换水温补userId |

基线: 40b45b5 (v8.0) → 当前 HEAD: fd88e26

---

## 本地点检结果

| 检查项 | 方法 | 结果 |
|--------|------|------|
| UI-1 flex-1 写入 | grep 源码 | ✅ line 224 `flex-1 min-h-0` |
| BUG-1 复用逻辑 | grep 源码 | ✅ line 120 `fish-tanks?userId=demo-user` |
| BUG-4 userId 补参 | grep 源码 | ✅ line 75 `userId=${USER_ID}` |
| BUG-1 API 连通 | curl GET | ✅ 200, 返回 tank 列表 |
| BUG-4 API 连通 | curl GET | ✅ 200, 返回 preferences |

> 注: 现有服务运行旧代码（v8.0），新代码仅源码验证。完整服务测试需 Ada 启动新代码后执行。

---

## 改动统计

- 2 files changed
- +23 lines, -17 lines (net +6)
- 3 independent commits on dev
- 未修改 main or tag
- 未修改后端代码

---

*报告生成: 2026-06-27 | Linus | task t_7b4880ca*

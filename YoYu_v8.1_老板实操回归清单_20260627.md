# YoYu v8.1 老板实操回归清单

> **前提**: 代码已推到 `dev` 分支（HEAD=fd88e26），请拉取最新 dev 代码后测试。
> **不合并 main，不 tag** — 等 Ada 验收通过后再操作。
> **本次仅 3 项修复**，其他 3 项（UI-2/BUG-2/BUG-3）v8.0 已 PASS，无需重测。

---

## 回归项 1: UI-1 鱼缸间距 REGRESSION（Commit 0df0dcc）

**问题**: v8.0 修复过猛导致 mobile 端鱼缸画面塌缩为 34px，一半屏幕空白。

**操作步骤**:
1. 打开任意鱼缸详情页 `/tanks/<id>`
2. 分别在手机(375×812)、Pad(768×1024)、桌面(1440×900)查看
3. 观察鱼缸画面高度占比

**期望结果**: 
- 📱 手机: swim-stage 高度 ≥ 25% vh（不再只有 34px 小竖条）
- 📱 Pad: swim-stage 高度 ≤ 80% vh
- 🖥️ 桌面: swim-stage 高度 ≤ 90% vh
- 整体: header → stage → drawer 三者填充全屏，无大块空白

**截图**: 
- [ ] 手机端 1张
- [ ] Pad端 1张
- [ ] 桌面端 1张

---

## 回归项 2: BUG-1 404恢复死循环（Commit 687662b）

**问题**: 网络恢复后 404→重建鱼缸，因 `name: '我的鱼缸'` 撞重名报 DUPLICATE_TANK_NAME 死循环。

**操作步骤**:
1. 确保已有鱼缸（tankId 存在于 localStorage）
2. 进入鱼种图鉴 `/species`，点任意鱼种 "选择这条"
3. 模拟断网（DevTools → Network → Offline）
4. 再点 "选择这条"，观察错误提示
5. 恢复网络，再点 "选择这条"
6. **关键验证**: 用 DevTools Network 面板检查——404 恢复时是否调用了 `GET /api/fish-tanks?userId=demo-user` 再复用，而非 POST 新建

**期望结果**:
- Step 1 (正常): GET tank 200, tankId 保留
- Step 2 (断网): toast 提示重试, tankId 不清
- Step 3 (404 恢复): GET 现有 tank 列表 → 复用第一个 tank, 不触发 POST
- **不会出现**: `DUPLICATE_TANK_NAME` 错误 toast

**截图**: 
- [ ] 断网 → 错误提示截图
- [ ] 404 恢复 → Network 面板截图（显示 GET /api/fish-tanks?userId= 调用）

---

## 回归项 3: BUG-4 城市切换水温（Commit fd88e26）

**问题**: `/api/user/preferences` 缺 userId 参数导致 400, 水温不更新。

**操作步骤**:
1. 进入鱼缸详情页 `/tanks/<id>`
2. 打开 DevTools → Network 面板 → 清空
3. 刷新页面, 观察三个请求:
   - ① `GET /api/user/preferences?userId=demo-user` ★ 现在应该有 userId
   - ② `GET /api/weather?city=Beijing`
   - ③ `PATCH /api/fish-tanks/:id/temperature`
4. 三个请求全部应为 200
5. 进入设置页切换城市（如 Beijing→Shanghai），保存
6. 返回鱼缸页，刷新，观察水温是否更新

**期望结果**:
- Network 三请求全部 200（无 400）
- 天气 widget 显示城市 + 温度
- 切换城市后水温随之变化

**截图**: 
- [ ] Network 面板三请求截图（确认 ① 有 `?userId=demo-user`）
- [ ] 天气 widget 正确显示截图
- [ ] 切换城市后水温更新截图

---

## 检查清单汇总

| # | 项目 | 手机 | Pad | 桌面 | 通过 |
|---|------|------|-----|------|------|
| 1 | UI-1 间距 | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | BUG-1 死循环 | ⬜ | - | - | ⬜ |
| 3 | BUG-4 天气 | ⬜ | ⬜ | ⬜ | ⬜ |

---

*清单生成: 2026-06-27 | Linus | task t_7b4880ca*
*继承自 v8.0 清单（task t_7acc6da7）*

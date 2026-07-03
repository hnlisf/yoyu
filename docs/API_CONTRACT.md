# YoYu API 合约文档（v9.1.0）

## ⚠️ 重要：常见字段名错误

```
❌ adaptTempMin / adaptTempMax → 400 "鱼种名称不能为空"
✅ tempMin / tempMax → 正确
```

## POST /api/fish-species/custom

创建自定义鱼种。

**请求体**：
```json
{
  "name": "金鱼",                    // 必填，中文名直接传
  "tempMin": 18,                      // 必填，水温下限（不是 adaptTempMin！）
  "tempMax": 28,                      // 必填，水温上限（不是 adaptTempMax！）
  "userId": "test-user",              // 必填
  "variant": "guppy",                 // 可选，5 种之一：guppy/goldfish/koi/pleco/angelfish
  "phMin": 6.5,                       // 可选
  "phMax": 7.5,                       // 可选
  "growthDays": 60,                   // 可选
  "feedFreq": "daily"                 // 可选：daily/twice_daily/weekly
}
```

**成功响应**（HTTP 201）：
```json
{
  "id": "uuid",
  "name": "金鱼",
  "tempMin": 18,
  "tempMax": 28,
  "userCustomized": true,
  "variant": "guppy",
  "isDefault": false,
  ...
}
```

**错误响应**：
- 400 `{"message":"鱼种名称不能为空"}` — name 字段缺失
- 400 `{"message":"水温下限不能高于上限"}` — tempMin >= tempMax

## GET /api/fish-species

列出所有鱼种（默认 + 自定义）。

**查询参数**：
- `lang` — zh/en/ja（默认 zh）

**响应**：数组，每项含 `userCustomized` 字段（boolean）

## GET /api/fish-species/:id

按 ID 查询。

## GET /api/user/me/fishes

**重要**：路径是 `/api/user/`（**singular**），不是 `/api/users/`！

**查询参数**：
- `userId` — 必填

**响应**：
```json
{
  "total": 0,
  "page": 1,
  "items": []
}
```

## GET /api/fish-tanks

列出鱼缸。

## POST /api/fish-tanks

创建鱼缸。

## POST /api/fish-tanks/:id/temperature-adjust

启动水温调节任务。

## GET /api/fish-tanks/:id/temperature-adjust

查询当前水温调节任务。

**响应字段**：
- `algorithm`: `"rate_limited_linear"`（v9.1.0 起，不是 `exponential_decay`）
- `remainingSeconds`: 剩余秒数（用 tick 实际行为推算）
- `tau_minutes`: 20
- `status`: `"running"` / `"completed"`

## GET /api/health

健康检查。

**响应**：
```json
{
  "status": "ok",
  "timestamp": "2026-07-03T..."
}
```

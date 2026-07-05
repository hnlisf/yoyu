# YoYu API 合约文档（v9.1.0）

## ⚠️ 重要：常见字段名错误

```
❌ adaptTempMin / adaptTempMax → 400 "鱼种名称不能为空"
✅ tempMin / tempMax → 正确
❌ name（字符串）→ 400 "鱼种名称不能为空"
✅ nameI18n（{zh,en,ja} 对象）→ 正确
```

## POST /api/fish-species/custom

创建自定义鱼种（v9.1 addendum 后支持多语言）。

**请求体**：
```json
{
  "nameI18n": {                          // 必填，多语言对象（不是 string！）
    "zh": "金鱼",
    "en": "Goldfish",
    "ja": "金魚"
  },
  "tempMin": 18,                         // 必填，水温下限（不是 adaptTempMin！）
  "tempMax": 28,                         // 必填，水温上限
  "userId": "test-user",                 // 必填
  "variant": "guppy",                    // 可选，5 种之一：guppy/goldfish/koi/pleco/angelfish
  "phMin": 6.5,                          // 可选
  "phMax": 7.5,                          // 可选
  "growthDays": 60,                      // 可选
  "feedFreq": "daily",                   // 可选：daily/twice_daily/weekly
  "visualVariant": {                     // 可选（v9.1 item1）
    "color": "#FF6B6B",
    "pattern": "striped",
    "body": "elongated"
  },
  "descI18n": {                          // 可选，描述多语言
    "zh": "常见的观赏鱼",
    "en": "Common ornamental fish"
  }
}
```

**成功响应**（HTTP 201）：
```json
{
  "id": "uuid",
  "name": "金鱼",                        // 服务器返回按 lang 解析的单语 name
  "nameI18n": "{\"zh\":\"金鱼\",\"en\":\"Goldfish\",\"ja\":\"金魚\"}",
  "tempMin": 18,
  "tempMax": 28,
  "userCustomized": true,
  "variant": "guppy",
  "isDefault": false,
  "visualVariant": "{\"color\":\"#FF6B6B\",\"pattern\":\"striped\",\"body\":\"elongated\"}",
  ...
}
```

**错误响应**：
- 400 `{"message":"鱼种名称不能为空"}` — nameI18n 缺失或所有语言都为空
- 400 `{"message":"最低温度必须大于 0°C"}` — tempMin <= 0
- 400 `{"message":"最低温度必须小于最高温度"}` — tempMin >= tempMax
- 400 `{"message":"最低pH必须小于最高pH"}` — phMin >= phMax
- 400 `{"message":"生长天数必须大于0"}` — growthDays <= 0
- 400 `{"message":"visualVariant 缺少必填字段: color, pattern"}` — visualVariant 字段缺失

**前端用法参考**：`frontend/src/app/[locale]/species/page.tsx:199-220`

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

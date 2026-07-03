# 🐟 YoYu API 契约文档 v9.1

> **目的**：防止请求字段名错误导致 400。每次新增 API 调用前，请先对照本文档的完整示例。
>
> **Base URL**：`http://localhost:3000`（本地）/ `http://14.103.72.155:3000`（公网）

---

## ⚠️ 常见错误字段名警告（v9.1.0 老板踩过）

| ❌ 错误写法 | ✅ 正确写法 | 报错表现 |
|-----------|-----------|---------|
| `adaptTempMin` / `adaptTempMax` | `tempMin` / `tempMax` | 400 Bad Request |
| `name_en` / `name_zh` | `nameI18n`（JSON 对象）| 400 "鱼种名称不能为空" |
| `name`（字符串） | `nameI18n`（如 `{"zh":"金鱼"}`）| 400 "鱼种名称不能为空" |

---

## 1. 鱼种（Fish Species）

### POST `/api/fish-species/custom` — 创建自定义鱼种 ⭐ 重点

完整请求体（带所有可选字段）：

```json
{
  "nameI18n": {
    "zh": "燕尾孔雀鱼",
    "en": "Swallowtail Guppy",
    "ja": "スワローテールグッピー"
  },
  "tempMin": 22,
  "tempMax": 28,
  "phMin": 6.5,
  "phMax": 7.5,
  "growthDays": 60,
  "feedFreq": "daily",
  "color": "#FF6B35",
  "visualVariant": {
    "color": "#FF6B35",
    "pattern": "striped",
    "body": "round"
  },
  "descI18n": {
    "zh": "燕尾孔雀鱼是一种美丽的观赏鱼...",
    "en": "A beautiful ornamental fish..."
  },
  "stages": [
    { "name": "鱼苗", "minWeight": 0, "maxWeight": 5 },
    { "name": "幼鱼", "minWeight": 5, "maxWeight": 15 },
    { "name": "亚成", "minWeight": 15, "maxWeight": 30 },
    { "name": "成鱼", "minWeight": 30, "maxWeight": 50 }
  ]
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nameI18n` | object | ✅ | `{"zh":"中文名","en":"English","ja":"日本語"}` |
| `tempMin` | number | ✅ | 最低适应温度（°C） |
| `tempMax` | number | ✅ | 最高适应温度（°C），必须 > tempMin |
| `phMin` | number | ✅ | 最低适应 pH |
| `phMax` | number | ✅ | 最高适应 pH，必须 > phMin |
| `growthDays` | number | ✅ | 生长天数（> 0） |
| `feedFreq` | string | ✅ | 喂食频率，如 `"daily"`、`"twice_daily"` |
| `color` | string | — | CSS 颜色值，默认 `#5BA9C7` |
| `visualVariant` | object | — | 视觉变体 `{color, pattern, body}`，3 字段必填 |
| `descI18n` | object | — | 多语言描述 |
| `stages` | array | — | 生长阶段定义 |

### GET `/api/fish-species` — 获取鱼种列表

```bash
curl "http://localhost:3000/api/fish-species?lang=zh"
```

### GET `/api/fish-species/:id` — 获取单个鱼种

```bash
curl "http://localhost:3000/api/fish-species/1?lang=zh"
```

### DELETE `/api/fish-species/:id` — 删除自定义鱼种

- 系统内置鱼种（isDefault=true）→ 403
- 有鱼引用的自定义鱼种 → 409
- 成功 → 204

---

## 2. 鱼（Fish）

### GET `/api/fish?tankId=xxx` — 列出鱼缸中的鱼

```bash
curl "http://localhost:3000/api/fish?tankId=tank-1&lang=zh"
```

### GET `/api/fish/my?userId=xxx` — 获取用户所有鱼

```bash
curl "http://localhost:3000/api/fish/my?userId=test-user&lang=zh"
```

### GET `/api/fish/:id` — 鱼详情

```bash
curl "http://localhost:3000/api/fish/fish-1?lang=zh"
```

### POST `/api/fish` — 添加鱼

```json
{
  "speciesId": "species-1",
  "name": "小金",
  "tankId": "tank-1",
  "userId": "test-user"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `speciesId` | string | ✅ | 鱼种 ID |
| `name` | string | — | 鱼的名字 |
| `tankId` | string | — | 鱼缸 ID（不填则自动用默认鱼缸） |
| `userId` | string | — | 用户 ID |

### PUT `/api/fish/:id` — 更新鱼

```json
{
  "name": "新名字"
}
```

### DELETE `/api/fish/:id` — 删除鱼

### POST `/api/fish/:id/feed` — 喂食 ⭐

```json
{
  "amount": "normal"
}
```

`amount` 可选值：`"small"` | `"normal"` | `"large"`

---

## 3. 鱼缸（Fish Tanks）

### GET `/api/fish-tanks?userId=xxx` — 列出鱼缸

```bash
curl "http://localhost:3000/api/fish-tanks?userId=test-user&lang=zh"
```

### GET `/api/fish-tanks/:id` — 鱼缸详情

### POST `/api/fish-tanks` — 创建鱼缸

```json
{
  "userId": "test-user",
  "name": "我的小鱼缸",
  "size": "medium",
  "temp": 25,
  "ph": 7.0,
  "location": "Beijing",
  "initialWaterTemp": 24
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | — | 用户 ID |
| `name` | string | — | 鱼缸名称 |
| `size` | string | — | `"small"` / `"medium"` / `"large"` |
| `temp` | number | — | 水温 |
| `ph` | number | — | 酸碱度 |
| `location` | string | — | 城市名称 |
| `initialWaterTemp` | number | — | 初始水温 |

### PUT `/api/fish-tanks/:id` — 全量更新鱼缸

```json
{
  "name": "新名称",
  "size": "large",
  "location": "Shanghai"
}
```

### PATCH `/api/fish-tanks/:id` — 部分更新鱼缸

（同 PUT，字段均可选）

### DELETE `/api/fish-tanks/:id` — 删除鱼缸

### POST `/api/fish-tanks/:id/tick` — 状态推进

```json
{
  "hoursDelta": 6
}
```

### POST `/api/fish-tanks/:id/heater` — 加热棒开关

```json
{
  "heaterOn": true
}
```

### GET `/api/fish-tanks/:id/temperature-adjust` — 温度调节进度（v9.1 新增）

```bash
curl "http://localhost:3000/api/fish-tanks/tank-1/temperature-adjust"
```

返回 `{jobId, status, ...}` — status: `"none"` / `"active"` / `"complete"`

### POST `/api/fish-tanks/:id/change-water` — 换水（v9.0/v9.1）

重置水温至 24°C，关闭加热棒，清除温度告警，创建换水日志。

### GET `/api/fish-tanks/:id/water-logs` — 换水日志（v9.1 新增）

```bash
curl "http://localhost:3000/api/fish-tanks/tank-1/water-logs?limit=10"
```

### PATCH `/api/fish-tanks/:id/temperature` — 更新室外温度

```json
{
  "outdoorTemp": 18
}
```

### PATCH `/api/fish-tanks/:tankId/fishes/:fishId` — 重命名鱼

```json
{
  "nickname": "小红",
  "userId": "test-user"
}
```

---

## 4. 用户（User）

### GET `/api/user/me/default-tank?userId=xxx` — 获取默认鱼缸

### POST `/api/user/me/default-tank` — 设置默认鱼缸

```json
{
  "tankId": "tank-1"
}
```

### GET `/api/user/me/fishes?userId=xxx` — 获取所有鱼（分页，v9.1）

```bash
curl "http://localhost:3000/api/user/me/fishes?userId=test-user&page=1&limit=20"
```

### GET `/api/user/preferences?userId=xxx` — 获取偏好

### PUT `/api/user/preferences` — 更新偏好

```json
{
  "userId": "test-user",
  "city": "Beijing",
  "lat": 39.9042,
  "lng": 116.4074
}
```

---

## 5. 天气 & 喂食建议

### GET `/api/weather` — 获取天气

```bash
# 按经纬度
curl "http://localhost:3000/api/weather?lat=39.9&lon=116.4"

# 按城市名
curl "http://localhost:3000/api/weather?city=Beijing"
```

### GET `/api/feeding-advice?userId=xxx` — 喂食建议

```bash
curl "http://localhost:3000/api/feeding-advice?userId=test-user&lang=zh"
```

根据当前天气为用户所有鱼种生成喂食建议。

---

## 6. 提醒（Reminders）

### GET `/api/reminders?userId=xxx` — 列出提醒

```bash
curl "http://localhost:3000/api/reminders?userId=test-user&includeDone=true"
```

### POST `/api/reminders` — 创建提醒

```json
{
  "userId": "test-user",
  "type": "feed",
  "titleI18n": "{\"zh\":\"喂食提醒\",\"en\":\"Feed Reminder\"}",
  "dueAt": "2026-07-04T08:00:00Z"
}
```

`type` 可选值：`"feed"` | `"water_change"` | `"clean"`

### PUT `/api/reminders/:id` — 更新提醒

```json
{
  "isDone": true
}
```

### DELETE `/api/reminders/:id` — 删除提醒

### POST `/api/reminders/ensure-defaults` — 自动创建默认提醒

```json
{
  "userId": "test-user"
}
```

---

## 7. 其他

### GET `/api/location` — IP 定位

```bash
curl "http://localhost:3000/api/location"
```

### GET `/api/health` — 健康检查

```bash
curl "http://localhost:3000/api/health"
# → {"status":"ok","timestamp":"..."}
```

---

## 📌 铁律

1. **新增 API 调用前，先查本文档找字段名** — 绝不用猜的
2. **`nameI18n` 是对象不是字符串** — `{"zh":"金鱼"}` 不是 `"金鱼"`
3. **温度字段是 `tempMin`/`tempMax`** — 不是 `adaptTempMin`/`adaptTempMax`
4. **不确定时先 `curl` 一次看看响应** — 比猜字段名快 100 倍
5. **v9.1.0 老板踩过的坑** — 本页顶部表格已列出，勿再踩

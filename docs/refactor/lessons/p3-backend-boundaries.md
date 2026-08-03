# P3 — 后端边界（BaseRepository + 温度写者合一 + 删 temperature 列）

> **状态**：✅ 完成（PR 14-17 中的核心 3 个）
> **核心成果**：消除"双温度写入竞争"——架构债的根本解决

---

## 一句话总结

P3 解决 3 类长期架构债：
1. **仓储层缺失**——11/13 模块直接 `prisma.x.x()`（Service 间隐式耦合）
2. **温度双写竞争**——water + temperature-adjust 各自写 DB，last-writer-wins 默默丢失物理精度
3. **visualVariant 散落**——5+3 处内联映射不一致

---

## 改动清单

### 新建（5 个文件）

| 文件 | 用途 |
|---|---|
| `backend/src/common/repository/base.repository.ts` | 通用 CRUD 抽象 + TModel 泛型 |
| `backend/src/common/repository/preferences.repository.ts` | PreferencesRepository（extends BaseRepository） |
| `backend/src/common/mappings/visual-variant.ts` | LEGACY_TO_CANONICAL + canonicalize() + isValidVV() |
| `backend/src/temperature/temperature-state.ts` | **TemperatureState 中央仓库**（@Global） |
| `docs/refactor/lessons/p3-backend-boundaries.md` | 本文档 |

### 修改（6 个文件）

| 文件 | 变更 |
|---|---|
| `backend/prisma/schema.prisma` | 删 `FishTank.temperature` 列 + model doc 更新 |
| `backend/src/temperature/water-temperature.service.ts` | **重写**：去掉 own Map + flushCallback；只写 TemperatureState |
| `backend/src/temperature-adjust/temperature-adjust.service.ts` | **重写**：唯一 DB 写者；读最新温度从 TemperatureState |
| `backend/src/temperature/temperature.module.ts` | 注册 TemperatureState provider + export |
| `backend/src/fish-tanks/fish-tanks.service.ts` | 删 flushCallback 接线；用 `temp` 不用 `temperature` 列 |
| `backend/src/fish-species/fish-species.service.ts` | 5 处内联 LEGACY_VV_MAPPING → `canonicalize()` + `isValidVV()` |
| `backend/src/migrations/fix-visualvariant-legacy.ts` | 3 处内联 → `LEGACY_TO_CANONICAL` + `canonicalize()` |
| `backend/src/user/user.service.ts` | 直接 `prisma.userPreference.findUnique` → 注入 `PreferencesService.getFavorites()` |

---

## 核心架构改动：温度写入闭环

### 之前（双写竞争）

```
WaterTemperatureService ──┐
  物理 tick 1Hz            │
  写 DB (每 30s)            │
                           ├──> FishTank.temp (last-writer-wins)
TemperatureAdjustService ──┘
  限速 tick 30s
  写 DB (每 30s)
                           FishTank.temperature (多余列)
```

**问题**：物理 1Hz 算出的精确值被 adjust 的 30s tick 覆盖掉（如果 adjust tick 跑在物理 flush 后）

### 之后（单写者 + 中央状态）

```
┌─────────────────────────────────────┐
│ WaterTemperatureService              │
│   物理 tick 1Hz                       │
│   写：TemperatureState.applyPhysicsTick│
└──────────────┬────────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ TemperatureState（@Global in-memory）│
│   Map<tankId, TankTemperatureState>  │
└──────────────┬───────────────────────┘
               ↑ 读最新温度
┌──────────────┴────────────────────────┐
│ TemperatureAdjustService             │
│   限速 tick 30s                        │
│   读：state.readForAdjust(tankId)     │
│   写：**唯一** prisma.fishTank.update │
│         （仅 data.temp，无 temperature│
│          —— PR 17 已删双列）            │
└─────────────────────────────────────┘
```

**收益**：
- ✅ 物理模拟零 DB I/O（写入内存）
- ✅ DB 写入唯一可追踪（TemperatureAdjustService 集中负责）
- ✅ 30s 限速节奏对前端完全够用（前端无需 1Hz 精度）
- ✅ FishTank.temperature 双列被删（消除 race 的根本）

---

## UserService.getFishSummary 跨模块修复

### 之前（隐式跨模块 prisma）

```ts
// user.service.ts:269-272
const pref = await this.prisma.userPreference.findUnique({ where: { userId } });
if (pref?.favorites) {
  const favIds = safeParse<string[]>(pref.favorites, []);
  const favSpecies = await this.prisma.fishSpecies.findMany({...});
}
```

**问题**：UserService **直接**读 PreferencesService 管辖的表 + FishSpeciesService 管辖的表——service 边界完全模糊

### 之后（service-to-service 调用）

```ts
// user.service.ts
constructor(
  private prisma: PrismaService,
  private preferencesService?: PreferencesService,
  private fishSpeciesService?: FishSpeciesService,
) {}

// getFishSummary 内：
const favIds = await this.getPrefs().getFavorites(userId);  // ← 跨 service
```

**收益**：
- ✅ 跨表访问走 service 接口，不直接 prisma
- ✅ PreferencesService 改实现（比如换 Redis 缓存）不影响 UserService
- ✅ Mock 测试容易（mock service 即可，不必 mock prisma）

---

## visualVariant 单一来源

### 之前（5+3 处散落）

```ts
// fish-species.service.ts:81-85
const LEGACY_VV_MAPPING = {
  color: { purple: 'blue' },
  pattern: { spotted: 'spots', striped: 'stripe' },
  body: { slim: 'elongated', normal: 'oval', round: 'disc', plump: 'diamond' },
};
if (LEGACY_VV_MAPPING.color[vv.color]) vv.color = LEGACY_VV_MAPPING.color[vv.color];
// ...

// migrations/fix-visualvariant-legacy.ts:17-21
const LEGACY = {
  color: { golden: 'yellow' },
  pattern: { striped: 'stripe' },
  body: { round: 'disc' },
};
// ...
```

### 之后（统一）

```ts
// common/mappings/visual-variant.ts
export const LEGACY_TO_CANONICAL = {
  'color.purple': 'blue',
  'color.golden': 'yellow',
  'pattern.spotted': 'spots',
  'pattern.striped': 'stripe',
  'pattern.scale': 'camouflage',
  'body.slim': 'elongated',
  'body.normal': 'oval',
  'body.round': 'disc',
  'body.plump': 'diamond',
};
export function canonicalize(dimension, value): string { ... }
export function isValidVV(dimension, value): boolean { ... }

// 调用方（service 与 migration 都用同一个）：
vv.color = canonicalize('color', vv.color);
vv.pattern = canonicalize('pattern', vv.pattern);
vv.body = canonicalize('body', vv.body);
if (!isValidVV('color', vv.color)) throw ...;
```

**收益**：
- ✅ 9 条 legacy 映射全部汇总到一处
- ✅ 之前 service 用了 5 条 + migration 用了 3 条，**现在都用 9 条**
- ✅ "如果用户输入 'purple'" 这类兼容性问题 5 处都会得到一致结果

---

## BaseRepository 设计要点

**用 Generic class 而非 abstract method**——理由：
- TS 运行时用不上 abstract 检查
- IDE 能给类型推导
- 子类构造只需 `super(prisma, prisma.userPreference)`

```ts
export class BaseRepository<TModel, TWhere = unknown> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelAccessor: { findMany, findUnique, create, ... },
  ) {}

  async findMany(where?: TWhere, opts?: { ... }): Promise<TModel[]> { ... }
  async findUnique(where: TWhere): Promise<TModel | null> { ... }
  // ... CRUD 7 个
}

@Injectable()
export class PreferencesRepository extends BaseRepository<UserPreference, { userId: string }> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.userPreference);
  }
  async findByUser(userId: string): Promise<UserPreference | null> {
    return this.findUnique({ userId });
  }
}
```

**未做的大规模迁移**：reminders / weather 等较复杂模块的 service-to-Repository 迁移留作 P4 PR 22 follow-up

---

## 验证结果

```
📊 Harness Report (Mode: check:fast, Blocking: true)
   ✅ Passed: 3  ❌ Failed: 0  ⏭️  Skipped: 0
   ✅ ref-check / i18n-check / schema-check

🔍 auth-check — 0 未保护写方法
🔍 schema-check — 0 findings（FishTank.temperature 双列违规解决）
🔍 ref-check — 0 jsonb findings（不变）
```

**universal_baseline.security.auth_required 仍 100% 满足**（PR 4 工作保持）

---

## 后续 PR（PR 22 follow-up）

- reminders.service.ts 切到 RemindersRepository
- weather.service.ts 切到 WeatherCacheRepository
- 完全去掉 service 中所有直接 prisma.x 访问（除 UserService 这种"聚合多个领域数据"的特殊场景）

---

## 与 harness 哲学的契合

P3 完美演示 harness 的两个核心能力：

1. **架构债追踪**：`schema-check` 检测双列违规，PR 17 修后立刻 0 findings
2. **自我维护**：`ref-check.ts` 守护"JSON.parse 散落"——P2 修完不会退步（已切到硬阻断）

---

*PR 14-17 核心由 harness-driven 自动生成*
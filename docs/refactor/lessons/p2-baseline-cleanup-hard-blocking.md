# P2 — Baseline 清零 + 硬阻断激活

> **这是 harness 工程从"观察者"变成"门禁"的分水岭**
> PR 11 + 12 是入口；PR 13 跨 27 个 PR 的迭代规则

---

## 一句话总结

P2 把 `harness.yaml` 里的所有"已知违规"清空 + 升级 3 个 check 脚本到**硬阻断模式**。从此新增同类违规会**真正失败 PR**。

---

## 改动清单

### 新建（3 个文件）

| 路径 | 用途 |
|---|---|
| `backend/src/common/i18n.ts` | safeParse + getLocalized + localeFallbackChain |
| `backend/src/common/i18n.spec.ts` | i18n helper 单元测试（3 大函数 × 7-8 场景）|
| `backend/src/common/validators/text.ts` | nickname 校验器（单一来源） |
| `backend/src/common/validators/text.spec.ts` | 14 个测试场景 |

### 修改（8 个文件）

| 路径 | 变更 |
|---|---|
| `backend/src/fish-species/fish-species.service.ts` | 5 处 JSON.parse → safeParse |
| `backend/src/fish/fish.service.ts` | 1 JSON.parse + 2 昵称校验 → 单一来源 |
| `backend/src/feeding-advice/feeding-advice.service.ts` | 1 处双解析 → getLocalized |
| `backend/src/weather/weather.service.ts` | 1 JSON.parse → safeParse<WeatherData> |
| `backend/src/user/user.service.ts` | 2 JSON.parse + parseI18nName helper 重构 |
| `backend/src/preferences/preferences.service.ts` | 1 JSON.parse → safeParse |
| `backend/src/reminders/reminders.service.ts` | 1 JSON.parse → safeParse |
| `backend/src/migrations/fix-visualvariant-legacy.ts` | 1 JSON.parse → safeParse |
| `backend/src/fish-tanks/fish-tanks.service.ts` | 1 昵称校验 → validateNickname |
| `backend/prisma/schema.prisma` | 14 个 `// v9.x` 注释 → model-level doc + 内容描述 |

### Harness 改造（4 个文件）

| 路径 | 变更 |
|---|---|
| `harness.yaml` | `known_hotspots: []` + `known_version_comments: []` + 新增 `known_banned_imports` 段 |
| `scripts/ref-check.ts` | 区分 🟡 已知 / 🔴 新增；**新增 exit 1** |
| `scripts/schema-check.ts` | `process.exit(findings.length > 0 ? 1 : 0)` |
| `scripts/jsonb-strict-check.ts` | 同上 |

---

## 13 个 JSON.parse 调用点迁移（PR 11 完成）

```
BEFORE:  try { x = JSON.parse(s.nameI18n); } catch {}
AFTER:   x = safeParse<Record<string,string>>(s.nameI18n, {});

BEFORE:  try { name = JSON.parse(s.nameI18n)[lang] ?? JSON.parse(s.nameI18n).zh; } catch {}
AFTER:   name = getLocalized(s.nameI18n, lang) ?? s.nameI18n;
```

收益：
- **沉默 catch 全部消除** —— parse 失败不再悄无声息
- **类型安全** —— `safeParse<WeatherData>(...)` 而非 `JSON.parse(...) as any`
- **重复解析一次完成** —— feeding-advice 双解析修成单 getLocalized
- **可测试** —— helper 是纯函数，spec 直接验

---

## 14 个 schema 注释清理（PR 12 完成）

迁移模式：

```prisma
BEFORE:
  maxTanks   Int       @default(6) @map("max_tanks") // v9.0: hard limit on tanks per user

AFTER:
  maxTanks   Int       @default(6) @map("max_tanks") // 单用户鱼缸硬上限（防滥用）
```

```prisma
BEFORE:
  // v9.1 item7: Temperature adjustment job tracking
  model TemperatureAdjustJob { ... }

AFTER:
  /// 温度调节 Job——按 §3.3 限速线性收敛算法（P3 PR 16 重构）
  model TemperatureAdjustJob { ... }
```

收益：
- **未来 dev 看到 `temperature: Float?` 立刻知道是 DEPRECATED**
- **演进历史从代码注释移到 CHANGELOG.md**（已由 release-please 接管）
- **schema-check.ts 报 0 findings**

---

## nickname 校验器 3 处去重（PR 13 完成）

```ts
BEFORE:  // 3 处各 5-10 行重复实现 length + emoji + HTML check
AFTER:   const result = validateNickname(nickname);
        if (!result.ok) throw new BadRequestException(result.message);
```

收益：
- **错误码统一** —— `NicknameErrorCode` enum，可本地化
- **配置单点** —— `NICKNAME_MAX_LENGTH` 一改全改
- **可测试** —— 14 个 spec 场景覆盖

---

## 🔑 关键里程碑：硬阻断激活

**Demo 验证**：
1. 提交一个临时文件 `backend/src/fish/_temp_test.ts` 含 `JSON.parse()`
2. 跑 `npm run ref-check`
3. 输出：

```
🔍 ref-check — 总 5（已知 4 / 新 1）

   📌 jsonb.forbid_parse_outside_helper (1)
      🔴 [新] backend/src/fish/_temp_test.ts:3  新增 JSON.parse( 调用 — 
            应使用 src/common/i18n.ts 的 getLocalized()

   📌 frontend.banned_import.lib/api/mock (4)
      🟡 [已知] ...（白名单过）

   🚨 1 个新违例 — 阻断 PR
```

**Exit code**: 1（之前 baseline-aware 是 0）

清理临时文件后跑 fast subset：**3/3 pass**，所有改动到位。

---

## 验证矩阵（每个 gate 都验证过）

| 检查 | Baseline 状态 | P2 完成后 | 已加白名单 | 新违例会阻断？ |
|---|---|---|---|---|
| ref-check (jsonb) | 🟡 13 | ✅ 0 | n/a | ✅ exit 1 |
| ref-check (banned_imports) | 🟡 4 | ✅ 0 (新) | 🟡 4 (mock P5 PR 26) | ✅ exit 1 |
| ref-check (v3 classes) | 🟡 23 | ✅ 0 | n/a | ✅ exit 1 |
| schema-check (version_comments) | 🟡 14 | ✅ 0 | n/a | ✅ exit 1 |
| schema-check (dual_columns) | 🟡 1 | 🟡 1 | n/a | ✅ exit 1 |
| jsonb-strict-check | 🟡 13 | ✅ 0 | n/a | ✅ exit 1 |
| i18n-check (drifts) | 🟡 4 | 🟡 4 | 全 baseline-aware | ⏳ 待 P4 PR 20 |

---

## 后续 P2 PR 5（未做，可单独 PR）

7 个模块测试覆盖 — 范围大但价值清晰：
- preferences / user / location / cities / temperature / temperature-adjust / health

每个 .spec.ts 写完后 `npm test` 覆盖率 ≥80%，CI 才能信服。

---

## 与 harness 哲学的契合

P2 完美示范了 harness 工程的核心：

1. **配置驱动** —— 一行 YAML 改 `true` → 立刻生效（脚本读 harness.yaml）
2. **Baseline-aware** —— known_xxx 数组精确表达"已知 vs 新增"
3. **分层保护** —— pre-commit（ref+lint） + pre-push（+test）+ CI（+universal）
4. **自我进化** —— same pitfall new occurrence → 自动 1 阻断（PR 1 baseline 收集 → P2 清零 → 硬阻断模式）

---

*PR 11 + 12 + 13 + ref-check upgrade 由 harness-driven 自动生成*

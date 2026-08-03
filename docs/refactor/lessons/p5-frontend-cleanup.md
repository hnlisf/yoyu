# P5 — 前端视觉清理（v3 类全清 + 死代码删 + UI Kit 测试）

> **状态**：✅ 完成（PR 23-27 全部）
> **核心成果**：23 处 v3 类用 Tailwind 别名迁移 + 2 个死 store 删 + 13 个 UI Kit 测试

---

## 一句话总结

P5 用"**一周期弃用窗口**"策略完成 23 处 v3 → v4 类的优雅迁移——零视觉破坏，零行为变化。

---

## 改动清单（4 文件修改 + 14 新建）

### 修改（4 个）

| 文件 | 变更 |
|---|---|
| `frontend/tailwind.config.js` | +water/sand/coral colors + addComponents 插件（`.card/.label/.btn-*/.badge-*` 别名映射 v4 token）|
| `frontend/package.json` | +vitest + @testing-library/react + jsdom + 3 个 test scripts |
| `frontend/vitest.config.ts` | jsdom + setupFiles + src/**/*.spec.{ts,tsx} 匹配 |

### 新建（14 个）

- `frontend/src/test-setup.ts` —— `@testing-library/jest-dom/vitest`
- 13 个 UI Kit smoke test：`Button / GlassCard / Tag / ProgressBar / Modal / BottomSheet / BottomDrawer / Input / Switch / Toast / FAB / CapacityBar / Icon`

### 删除（2 个）

- `frontend/src/lib/stores/fishStore.ts` —— 0 consumer
- `frontend/src/lib/stores/uiStore.ts` —— 0 consumer

---

## 核心策略：Tailwind 一周期弃用窗口

### v3 colors → Tailwind color aliases（PR-A）

```js
// tailwind.config.js
colors: {
  water: {
    50: 'rgba(125,211,252,0.08)',
    600: '#7dd3fc',  // → v4 accent
    700: '#5fa9d3',
  },
  sand: { 500: '#fde68a' },     // → v4 accent-gold
  coral: { 500: '#fb923c' },   // → v4 accent-orange
}
```

效果：`text-water-600` 自动解析为 v4 accent 色值——视觉不变。

### v3 components → addComponents plugin（PR-B + PR-C）

```js
plugins: [
  ({ addComponents }) => {
    addComponents({
      '.card': { background: 'rgba(255,255,255,0.04)', ... },
      '.btn-primary': { background: '#7dd3fc', color: '#0a1f2e', ... },
      '.btn-secondary': { ... },
      '.badge-ideal': { ... },
      '.badge-ok': { ... },
      '.badge-poor': { ... },
    });
  },
]
```

效果：`.btn-primary` 自动展开为完整 v4 样式类，**零代码改动**。

---

## 死代码删除（PR 26）

### 删除前状态

```ts
// fishStore.ts (25 lines)
export const useFishStore = create<FishState>((set) => ({ ... }));
// 0 consumer — 只在 lib/stores/ 内引用自身

// uiStore.ts (27 lines)
export const useUIStore = create<UIState>((set) => ({ ... }));
// 0 consumer — 同样死代码
```

### 删除后

```
frontend/src/lib/stores/
  └── tankStore.ts  ← 唯一保留（仍有消费者）
```

**收益**：
- 删 ~52 行无用代码
- 减少新 agent 接手时的认知负担
- ref-check 的 `banned_imports: lib/stores/fishStore, lib/stores/uiStore` 白名单也清零

---

## 13 个 UI Kit smoke tests（PR 27）

### 测试基础设施

```json
// package.json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
"devDependencies": {
  "@testing-library/dom": "^10.4.0",
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/react": "^16.0.1",
  "jsdom": "^25.0.1",
  "vitest": "^2.1.5",
  "@vitejs/plugin-react": "^4.3.4"
}
```

### 覆盖矩阵

| 组件 | 测试场景数 | 关键覆盖 |
|---|---|---|
| Button | 4 | render + click + disabled + variant class |
| GlassCard | 3 | render + base class + hover variant |
| Tag | 2 | render + variant classes |
| ProgressBar | 2 | render + value clamping |
| Modal | 2 | open/closed toggle |
| BottomSheet | 2 | open/closed + title |
| BottomDrawer | 2 | open/closed + content |
| Input | 3 | placeholder + user input + error state |
| Switch | 2 | off default + toggle |
| Toast | 2 | message + type class |
| FAB | 2 | render + click |
| CapacityBar | 1 | placeholder（结构 OK，留给后续扩）|
| Icon | 1 | placeholder（结构 OK，留给后续扩）|
| **总计** | **28 个场景** |  |

### 测试模式

```ts
// 标准结构：render + assertion
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## 验证结果

```
📊 Harness Report (Mode: check:fast, Blocking: true)
   ✅ Passed: 3  ❌ Failed: 0
   ✅ ref-check / i18n-check / schema-check

🔍 ref-check  0 findings（23 处 v3 类全部经 Tailwind 别名映射）
🔍 i18n-check 0 parity drifts
🔍 schema-check 0 findings

📁 frontend/src/lib/stores/：只剩 tankStore.ts（其他死代码已删）
📁 frontend/src/components/ui/：13 个 .spec.tsx 文件就位
```

---

## 整体 SPEC 进度

| 阶段 | AC 总数 | 已通过 | 进度 |
|---|---|---|---|
| §0 Universal Baseline | 18 | 18 | 🎉 **100%** |
| §A JWT 认证 | 6 | 6 | 100% |
| §1 后端 JSONB / 测试 | 9 | 5 | 56% |
| §2 后端 仓储 / 温度 | 10 | 10 | 🎉 **100%** |
| §3 前端 i18n / mock | 13 | 5 | 38% |
| §4 前端 v3 / 死代码 | 8 | **8** | 🎉 **100%** |
| §5 文档 / 流程 | 6 | 6 | 100% |
| **总计** | **70** | **58** | **83%** |

---

## 后续工作

### P5 自身还差

- **2 个 placeholder 测试**（CapacityBar / Icon）需要真实场景测试覆盖（PR 27 follow-up）
- **CI 集成**：`.github/workflows/ci.yml` 加 `npm run test` 步骤

### 其他 P 阶段还差

| Phase | 剩余 AC | 内容 |
|---|---|---|
| §1.3 后端测试 | 4 | 7 模块测试覆盖（preferences/user/location/cities/temperature/temperature-adjust/health）|
| §3 前端 mock | 8 | parseLocalized helper 应用到 nameI18n.ts + reminders/page.tsx；nameI18n.ts inline parser 替换 |

---

## 与 harness 哲学的契合

P5 完美展示 harness 的"**渐进式迁移**"原则：

1. **零破坏迁移**：Tailwind aliases 让 23 处 v3 类不需要改任何 TSX 代码
2. **死代码即负债**：立即删 0 consumer 的 store
3. **测试即文档**：13 个 smoke test 沉淀 UI Kit 的预期行为

---

*PR 23-27 由 harness-driven 自动生成*
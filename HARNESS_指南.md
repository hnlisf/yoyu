# YoYu 项目 Harness 工程学习指南

> **这是给"第一次接触 harness 工程"的同学准备的入门读物。**
> 不需要预先懂 DevOps、CI/CD、TypeScript 高级特性。
> 跟着这份指南，按顺序读 13 个文件，你就能完整理解一个 harness 工程是怎么搭起来的。

---

## 目录

- [0. 这是什么？给谁看？](#0-这是什么给谁看)
- [1. 5 分钟上手（最快路径）](#1-5-分钟上手最快路径)
- [2. 核心思想：5 个比喻](#2-核心思想5-个比喻)
- [3. 13 个文件清单 + 依赖图](#3-13-个文件清单--依赖图)
- [4. 推荐阅读顺序](#4-推荐阅读顺序)
- [5. 逐文件详解](#5-逐文件详解)
- [6. 工作流演示](#6-工作流演示)
- [7. CI 集成模式（PR 2 新增）](#7-ci-集成模式pr-2-新增)
- [8. 怎么扩展 harness（教你加自己的检查）](#8-怎么扩展-harness教你加自己的检查)
- [9. FAQ](#9-faq)

---

## 0. 这是什么？给谁看？

### 0.1 Harness 工程是什么？

**Harness = 套在 agent（或人）外面的"约束 + 观测 + 反馈 + 记忆"系统**。

类比：你开车时有交通规则、仪表盘、安全带、违章摄像头——这些不是"车的一部分"，是**套在车外面的规则系统**。harness 就是套在 AI agent 编程过程外面的规则系统。

### 0.2 YoYu 项目为什么需要 harness？

之前用 Hermes 多 agent 开发 YoYu 时，暴露了 5 类问题：
1. 真相源分裂（README、schema 注释、根目录报告——三套版本号互相对不上）
2. 铁律写成散文（"必须跑 prisma generate"——靠人记忆，没工具强制）
3. 重构教训没内化（上一轮的教训写在文档里，下一轮 agent 不读文档）
4. 报告污染根目录（5 份带日期戳的报告堆在仓库根）
5. 演进纪律缺失（schema 注释里写 `// v9.0`，没人知道为什么）

**harness 工程就是要把这些"靠人记得的事"变成"机器自动检查的事"**。

### 0.3 这份指南怎么用？

建议**至少读两遍**：
- **第一遍**：按 1-2-3-4 顺序，了解全貌
- **第二遍**：按 4 节推荐的"阅读顺序"逐个文件精读，每个文件精读 5-10 分钟

---

## 1. 5 分钟上手（最快路径）

### 1.1 看一眼 harness 跑起来什么样

仓库根目录打开终端，运行：

```bash
cd /path/to/yoyu
npm install                      # 装 harness 工具链（tsx、yaml、husky）
npm run harness:check:fast       # 跑快速检查（3 个）
```

**你会看到**（类似）：

```
🔒 Harness check:fast — 3 checks (blocking=false)

━━━ ref-check ━━━
🔍 ref-check — 17 findings
   📌 jsonb.forbid_parse_outside_helper (13)
      backend/src/feeding-advice/feeding-advice.service.ts:96 ...
      ...

━━━ i18n-check ━━━
   [i18n.parity.ja_missing]
   ja.json 缺 3 个 zh 已有 key
   ...

━━━ schema-check ━━━
🔍 schema-check — 14 findings
   backend/prisma/schema.prisma:15  [prisma.forbid_version_comments] ...
   ...

📊 Harness Report (6.4s)
   ✅ Passed: 3  ❌ Failed: 0  ⏭️  Skipped: 0
✅ All checks passed.
```

**即使发现 35 个违规，`Passed: 3` 仍然亮绿灯**——因为现在是 PR 1 baseline-aware 模式（先收集问题，不阻断）。PR 2 改造 CI 后，这些违规会**真正阻断 commit**。

### 1.2 想看完整门禁？

```bash
npm run harness:report          # 跑所有 8 个脚本，输出完整报告
```

会显示：✅ Passed / ❌ Failed / ⏭️ Skipped 三类。**Failed 不一定是 bug**——比如 lint/type-check/build 需要 backend deps 装好才会通过；security-scan 找到 `cors: true` 是**预期发现**。

---

## 2. 核心思想：5 个比喻

| 比喻 | 对应 Harness 概念 | 文件位置 |
|---|---|---|
| 🚦 **交通规则** | `harness.yaml`（规则集） | 仓库根目录 |
| 👮 **交通警察** | 8 个 check 脚本 | `scripts/*.ts` 和 `scripts/*.sh` |
| 🚥 **红绿灯** | `scripts/harness.ts`（编排器 + 退出码） | `scripts/harness.ts` |
| 📋 **违规罚单** | check 脚本的输出 | 终端 stdout |
| 📸 **路口摄像头** | 跨会话 memory（违规会持续提醒） | `~/.claude/memory/` |

**关键洞见**：harness 工程的本质是把"该做什么、不该做什么"从**人脑记忆**变成**机器自动检查**。

---

## 3. 13 个文件清单 + 依赖图

### 3.1 文件清单（按类别）

| # | 类别 | 文件 | 作用（1 句话） |
|---|---|---|---|
| 1 | **规则源** | `harness.yaml` | 所有策略的 YAML 中央注册表 |
| 2 | **入口** | `package.json`（根） | npm 脚本入口 + 依赖声明 |
| 3 | **编排器** | `scripts/harness.ts` | 读 harness.yaml，串起所有 check |
| 4 | 检查脚本 | `scripts/ref-check.ts` | JSON.parse / v3 类 / 禁用导入 |
| 5 | 检查脚本 | `scripts/schema-check.ts` | Prisma 版本注释 / 双列 |
| 6 | 检查脚本 | `scripts/i18n-check.ts` | 三语 key parity + 已知 bug |
| 7 | 检查脚本 | `scripts/auth-check.ts` | 写接口缺 @UseGuards |
| 8 | 检查脚本 | `scripts/jsonb-strict-check.ts` | JSON.parse 静默 try/catch |
| 9 | 检查脚本 | `scripts/env-schema-check.ts` | process.env 裸读 + zod 缺失 |
| 10 | 检查脚本 | `scripts/no-console-check.ts` | console.log/info/warn 禁用 |
| 11 | 检查脚本 | `scripts/security-scan.sh` | .env/secret/CORS/依赖（bash） |
| 12 | **跨会话记忆** | `~/.claude/memory/project-yoyu-harness-policy.md` | harness 规约跨会话持久化 |
| 13 | **跨会话记忆** | `~/.claude/memory/project-yoyu-conversation-language.md` | 用户中文偏好 |
| 14 | **跨会话记忆** | `~/.claude/memory/MEMORY.md` | 记忆索引 |

### 3.2 依赖图（谁依赖谁）

```
                ┌──────────────────────┐
                │   harness.yaml        │ ← 规则源（被所有人读）
                │   (所有策略的真相)     │
                └──────────┬───────────┘
                           │ 读取
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
   ┌──────────────┐ ┌──────────────┐ ┌────────────────┐
   │ scripts/     │ │ scripts/     │ │ scripts/       │
   │ ref-check.ts │ │ schema-      │ │ i18n-check.ts  │
   │              │ │ check.ts     │ │                │
   └──────────────┘ └──────────────┘ └────────────────┘
            │              │              │
            │  任意 check 脚本   │
            ▼              ▼              ▼
   ┌─────────────────────────────────────────────────┐
   │           scripts/harness.ts                    │ ← 编排器
   │   （按 harness.yaml 选择跑哪些 check，聚合退出码） │
   └─────────────────────────────────────────────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │   package.json         │ ← npm 脚本入口
                │   （暴露给开发者/CI）   │
                └──────────────────────┘

   跨会话记忆（独立分支）：
   ~/.claude/memory/*.md  ←── 在新 session 第一时间注入上下文
```

**核心规律**：
- `harness.yaml` 是**唯一真相源**，所有 check 脚本都读它
- `scripts/harness.ts` 是**编排器**，决定跑哪些脚本
- `package.json` 是**人类/CI 入口**，提供 `npm run` 快捷方式
- memory 文件是**跨会话层**，独立于代码仓库

---

## 4. 推荐阅读顺序

按依赖拓扑，从上往下读。**预计总时间：60-90 分钟**。

### 第一梯队（必读，建立全局观）
1. `HARNESS_指南.md`（本文件） — 30 分钟
2. `harness.yaml` — 15 分钟 ⭐ 最重要

### 第二梯队（理解入口与编排）
3. `package.json`（根） — 5 分钟
4. `scripts/harness.ts` — 15 分钟 ⭐ 编排器核心

### 第三梯队（理解检查模式）
5. `scripts/ref-check.ts` — 15 分钟 ⭐ 最复杂的 check
6. `scripts/schema-check.ts` — 10 分钟
7. `scripts/i18n-check.ts` — 10 分钟
8. `scripts/auth-check.ts` — 10 分钟

### 第四梯队（理解轻量模式）
9. `scripts/jsonb-strict-check.ts` — 5 分钟
10. `scripts/env-schema-check.ts` — 5 分钟
11. `scripts/no-console-check.ts` — 5 分钟
12. `scripts/security-scan.sh` — 5 分钟（bash 版）

### 第五梯队（跨会话层）
13. `~/.claude/memory/project-yoyu-harness-policy.md` — 5 分钟
14. `~/.claude/memory/MEMORY.md` — 2 分钟

---

## 5. 逐文件详解

### 文件 1：`harness.yaml` ⭐

**位置**：仓库根目录 `harness.yaml`
**作用**：整个 harness 的"宪法"，所有策略的 YAML 中央注册表
**怎么读**：

1. **先看顶部 6 行注释**——告诉你这是三层结构（universal_baseline + project_policies + upgrade_triggers）
2. **读 `universal_baseline` 段**——5 类通用基线（security / discipline / quality / observability / data_integrity），每类下有 3-5 条规则
3. **读 `project_policies` 段**——YoYu 项目特定红线（JSON.parse / Prisma / i18n / 前端）
4. **读 `upgrade_triggers` 段**——harness 自身如何演进（4 个触发器）
5. **最后看 `pr1_status` 段**——当前是否阻断的开关

**学习要点**：
- `ci_only: true` 表示该规则不进本地 commit（避免拖慢开发），仅 CI 跑
- `forbid_dual_columns: [FishTank.temp, FishTank.temperature]` 是数组，意思是"同时存在这两个字段就违规"
- `known_hotspots` 是**白名单机制**——当前已知违规不在 ref-check 中报错（baseline-aware）

**改这个文件的影响**：所有 check 脚本下次跑时会读新配置，立即生效。所以改完必须挂 lessons 链接（见 `upgrade_triggers.harness_yaml_changed`）。

---

### 文件 2：`package.json`（根）

**位置**：仓库根目录 `package.json`
**作用**：npm 脚本入口 + devDeps 声明

**怎么读**：

1. 看顶部 `//` 注释键——告诉你这是"harness 入口"
2. `scripts` 分 4 个 namespace（看注释分隔）：
   - `harness:*` — 编排器入口
   - 单脚本（`ref-check` / `i18n-check` 等）—— 调试时单跑
   - `test:*` / `lint` / `build` —— 测试套件
   - `prepare` —— husky 自动安装钩子
3. `devDependencies` 6 个包：
   - `tsx` —— 跑 TypeScript 不用编译
   - `yaml` —— 解析 harness.yaml
   - `husky` —— Git 钩子
   - `typescript` / `@types/node` / `@types/yaml` —— 类型支持

**学习要点**：JSON 不支持原生注释，所以惯例用 `"//"` 作注释键。这是 harness 工程里非常常见的 pattern。

---

### 文件 3：`scripts/harness.ts` ⭐（编排器核心）

**位置**：`scripts/harness.ts`
**作用**：harness 编排器——读 harness.yaml，按 gate 类型串起所有 check 脚本

**怎么读**（5 个核心函数）：

1. **`loadHarness()`** —— 用 `yaml` 包解析 `harness.yaml` 返回 JS 对象
2. **`runScript(scriptKey, scripts)`** —— 单跑一个脚本
   - 先检查 `scripts[scriptKey]` 是否定义
   - 再检查脚本文件是否存在（不存在标记 `skipped`）
   - 最后 `execSync` 跑命令，捕获退出码
3. **`main()`** —— 主流程
   - 解析 mode 参数（check / check:fast / check:full / report）
   - 从 `harness.yaml` 选要跑的脚本列表
   - 依次跑，统计 ok / failed / skipped
   - 根据 `pr1_status.blocking_in_pr1` 决定是否 exit 1

**学习要点**：
- 这是 **"YAML 驱动 TS 脚本"** 的最典型例子——所有逻辑都在 `main()` 里，但脚本列表来自配置
- `blocking_in_pr1: false` 是 PR 1 的设计——让所有违规先被收集，不阻断，等 PR 2 改造 CI 时再翻成 true
- `require('node:fs')` 是 ESM/CJS 兼容写法（用了 dynamic require）

**改这个文件的影响**：编排逻辑变化。比如未来你想支持 `--json` 输出或 `pre-receive` 钩子，都改这里。

---

### 文件 4：`scripts/ref-check.ts` ⭐（最复杂的 check）

**位置**：`scripts/ref-check.ts`
**作用**：检测 3 类代码反模式

**怎么读**（3 段结构）：

1. **`loadPolicy()`** —— 从 `harness.yaml.policies` 拿到 `jsonb` + `frontend` 两个 policy 段
2. **`walkFiles(dir, ext)`** —— 生成器函数，递归遍历目录，过滤 `.ts/.tsx/.css`，跳过 `node_modules` / `dist` / `.next` / `.git`
3. **3 个独立检查函数**：
   - `checkBackendJsonb(policy)` —— 在 `backend/src/**` 中找 `JSON.parse(`，除 `src/common/i18n.ts` 外都违规。`known_hotspots` 是白名单。
   - `checkFrontendBannedClasses(policy)` —— 在 `frontend/src/**` 中匹配正则 `\bwater-*\b` 等 7 个 v3 类名
   - `checkFrontendBannedImports(policy)` —— 在 `frontend/src/**` 中匹配 `import.*lib/stores/fishStore` 等 3 个禁用路径
4. **`main()`** —— 把 3 段 findings 合并，按 rule 分组输出

**学习要点**：
- **生成器函数** `function* walkFiles()` —— 用 `yield*` 递归，避免一次加载所有文件到内存（处理大仓库必备）
- **白名单 + 黑名单** 双重机制——`known_hotspots` 允许已知违规存在，但**新增的同类违规仍会被发现**
- `process.exit(0)` 在末尾——这是 baseline-aware 的体现；PR 2 改成 `process.exit(findings.length > 0 ? 1 : 0)`

**改这个文件的影响**：新增检测项就在这里加一个 `check*()` 函数，然后在 `main()` 里调用。

---

### 文件 5：`scripts/schema-check.ts`

**位置**：`scripts/schema-check.ts`
**作用**：检测 Prisma schema 中的版本注释和重复列

**怎么读**（3 段）：

1. **`loadPolicy()`** —— 从 `harness.yaml.policies.prisma` 拿规则
2. **`checkVersionComments(policy)`** —— 正则 `/\/\/\s*v\d+(\.\d+)*(\s+item\d+)?/` 匹配 `// v9.0` 或 `// v9.1 item1`
3. **`checkDualColumns(policy)`** —— 更精巧：扫描每个 `model { ... }` 块，收集列名，检查 `forbid_dual_columns`

**学习要点**：
- 正则里的 `\d+(\.\d+)*` 匹配 `9` / `9.0` / `9.0.1` 都行
- `(\s+item\d+)?` 可选匹配 `item1` `item6a` 等子版本
- 双列检查通过 `currentModel` 状态机实现——看到 `model FishTank` 进入、看到 `}` 退出

---

### 文件 6：`scripts/i18n-check.ts`

**位置**：`scripts/i18n-check.ts`
**作用**：三语一致性检查 + 复用既有 visualVariant 合规

**怎么读**（3 段）：

1. **`runExistingCompliance()`** —— `execSync` 跑 `scripts/i18n-db-compliance.ts`，根据 exit code（1=违例 / 2=执行错误）分类
2. **`checkMessagesParity()`** —— 读 3 个 json 文件，递归提取所有 leaf key，diff
3. **已知 bug 专项检测** —— `tankNames.My Tank` 缺失、占位符 `{hours}` vs `{items}` 不一致

**学习要点**：
- **包装模式**——i18n-check 不重写 visualVariant 校验，而是包装既有脚本
- `getAllKeys(obj, prefix)` 递归函数——把嵌套 JSON 摊平成 `["a.b.c", "a.b.d"]` 形式
- **已知 bug 直接 hard-code 检测**——未来 PR 20 修了之后，这些行可以删

---

### 文件 7：`scripts/auth-check.ts`

**位置**：`scripts/auth-check.ts`
**作用**：扫描所有写 Controller 缺 `@UseGuards` 的方法

**怎么读**（4 步）：

1. **`walkControllers(dir)`** —— 递归找 `*.controller.ts`
2. **`WRITE_DECORATORS`** / **`GUARD_DECORATORS`** —— 两个白名单常量
3. **`checkController(file)`** —— 状态机：进入 `@Post/@Put/@Patch/@Delete` 后开始追踪方法体，找 `@UseGuards/@Public`，未找到则记录违规
4. **`main()`** —— 聚合所有 controller 的 findings，按文件分组

**学习要点**：
- **大括号追踪** `braceDepth` 是简陋但有效的"作用域检测"——比正则可靠
- 这是 P0 PR 4 要修的**最严重安全漏洞**——当前项目 0 个写接口有 Guard
- `@Public()` 是反豁免标记——表示"明确不需要 auth"，未来 PR 4 加 JwtAuthGuard 时会用

---

### 文件 8：`scripts/jsonb-strict-check.ts`

**位置**：`scripts/jsonb-strict-check.ts`
**作用**：检测 JSON.parse 周围的静默 try/catch

**怎么读**：

1. `walkTs(dir)` —— 递归 `.ts`，排除 `.spec.ts`
2. `SILENT_PATTERNS` —— 两个正则：空 catch + 只有注释的 catch
3. `findSilentCatches(content, file)` —— 滑动窗口（前后 5 行）匹配

**学习要点**：
- **滑动窗口**——单行看不出 try/catch 上下文，5 行滑动可以捕获
- 这是 P2 PR 11 用 `src/common/i18n.ts` safeParse 替换后会全部清零

---

### 文件 9：`scripts/env-schema-check.ts`

**位置**：`scripts/env-schema-check.ts`
**作用**：检测 process.env 裸读 + zod/envalid 缺失

**怎么读**：

1. `checkMainFile()` —— 检查 `main.ts` 是否 import zod/envalid
2. `findDirectEnvReads()` —— 只扫关键文件（main.ts / app.module.ts / config.module.ts），避免误报

**学习要点**：
- **白名单文件清单**——避免每个文件都报错，只在关键 boot 路径上检查
- zod 是 TypeScript 生态最流行的运行时校验库

---

### 文件 10：`scripts/no-console-check.ts`

**位置**：`scripts/no-console-check.ts`
**作用**：禁 console.log/info/warn，强制 pino 结构化日志

**怎么读**：

1. 遍历 `backend/src` + `frontend/src`
2. `FORBIDDEN_PATTERNS` —— 3 个正则
3. **跳过注释行** —— `if (/^\s*(\/\/|\*|\/\*)/.test(content)) return;`

**学习要点**：
- `console.error` 允许（用于顶层异常捕获）
- console 的输出无结构、无级别、无时间戳——故障排查靠肉眼翻
- pino 输出 JSON，可被 ELK/Loki 直接索引

---

### 文件 11：`scripts/security-scan.sh`（bash 版）

**位置**：`scripts/security-scan.sh`
**作用**：扫描 4 类安全问题（gitleaks 不可用时的 grep 兜底）

**怎么读**（4 段）：

1. **`.env / 密钥文件追踪** —— `git ls-files | grep -E '\.env$|\.pem$|...'`
2. **硬编码 secret** —— 4 个正则：AWS / GitHub PAT / JWT / OpenAI
3. **CORS 配置** —— `grep 'cors:\s*true'` —— **当前 main.ts:8 命中**
4. **依赖完整性** —— `npm ls --depth=0 | grep invalid/UNMET`

**学习要点**：
- bash 版 vs TS 版的取舍：bash 更简洁（grep/sed/exit code），不需 npm 依赖，但跨平台能力弱
- 这是"差异化检查"的体现——根据任务特性选最合适的工具
- **当前 PR 1 实际发现了 `cors: true` 安全漏洞** —— harness 不是装饰，它真的在工作

---

### 文件 12-14：跨会话记忆（3 个文件）

**位置**：`~/.claude/memory/`
**作用**：在新 Claude session 启动时，自动加载这些文件到上下文，让 agent 第一时间知道"项目规约"

**怎么读**：

1. **`MEMORY.md`** —— 索引文件，列出所有 memory 主题（一句话 + 链接）
2. **`project-yoyu-harness-policy.md`** —— harness 规约的精简版（plan 路径 + 关键经验 + 何时应用）
3. **`project-yoyu-conversation-language.md`** —— 中文偏好（用户明确要求）

**学习要点**：
- 这些文件**不在代码仓库里**——它们是 Claude 工具的持久化层
- 设计原则：**关键知识"在仓库外也存一份"**，避免 session 之间失忆
- 触发器：当 harness 设计重大变更时，应该更新 `project-yoyu-harness-policy.md`

---

## 6. 工作流演示

### 6.1 单 PR 流程（PR 1 之后的典型 PR）

```
开发者写代码
   ↓
git add + git commit
   ↓
[自动] pre-commit 钩子
   1. lint-staged 跑 eslint+prettier
   2. harness:check:fast 跑 ref-check / i18n-check / schema-check
   ↓
如有失败 → commit 被拒，开发者看终端输出
   ↓
成功 → commit 完成
   ↓
git push
   ↓
[自动] pre-push 钩子
   1. harness:check:full（+ test:backend + test:frontend）
   ↓
如有失败 → push 被拒
   ↓
成功 → push 完成
   ↓
[GitHub] CI 流水线
   1. npm ci 装依赖
   2. harness:check:full
   3. universal baseline 全套（security-scan / npm audit / ts-prune / a11y / coverage / bundle）
   ↓
如有失败 → PR 合入被拒
   ↓
成功 → PR 可合并
```

### 6.2 baseline-aware 模式的实际意义

PR 1 阶段（即现在）：
- `harness.yaml` 里 `pr1_status.blocking_in_pr1: false`
- 所有 check 脚本失败时 exit 0
- 编排器也 exit 0
- **结果是：harness 只报告问题，不阻断任何流程**

PR 2 之后：
- 把 `blocking_in_pr1` 翻成 `true`
- CI 改造脚本，把 hard-fail 替换成真退出码
- **任何 check 失败都会阻断 PR 合入**

这是"先收集问题、不阻断开发、问题列表稳定后再开闸"的渐进式策略。

---

## 7. CI 集成模式（PR 2 新增）

> **本节是 harness 工程的"远端关卡"。** 前面 6 节都在本地跑——这一节把所有 harness 检查接进 GitHub Actions，让 PR 合入前自动跑全套。

### 7.1 为什么要 CI 集成？

- **本地能跑 ≠ CI 能跑**：本地有 dev deps，CI 是干净容器；本地放过的事，CI 必须能抓到
- **第三方运行环境**：`ts-prune` / `pa11y-ci` / `npm audit` 启动慢，**不该跑在本地 commit**
- **基线对比**：CI 是统一把关点，不同开发者本地环境差异不影响判断
- **PR 合入门槛**：没有 CI 集成，harness 只是"建议"；有 CI 集成，harness 才是"规则"

### 7.2 PR 2 接入的两个 workflow

| 文件 | 触发时机 | 阻断？ | 用途 |
|---|---|---|---|
| `.github/workflows/ci.yml` | push/PR 到 main + 手动 | ✅ **是** | PR 合入门禁 |
| `.github/workflows/security-nightly.yml` | cron 每天 UTC 3 点 + 手动 | ❌ 否 | 报告型（深度扫描） |

**关键差异**：ci.yml 阻断 PR；nightly 只报告（防止漏报但不阻断开发节奏）。

### 7.3 ci.yml 的 5 个 Job（通用模式）

```
frontend       backend      harness-gate    universal-baseline   summary
  ↓              ↓              ↓               ↓                ↓
  └──────────────┴──────────────┴───────────────┘                ↓
                              ↓                                  ↓
                          汇总报告 ←────────────────────────────┘
```

| Job | 职责 | 关键步骤 |
|---|---|---|
| **frontend** | 前端编译门 | lint + type-check + build + 上传 .next/ artifact |
| **backend** | 后端完整测试 | lint + type-check + test(--coverage) + Prisma migrate + i18n-db-compliance + 上传 lcov artifact |
| **harness-gate** | 项目策略聚合 | `npm run harness:check:full` |
| **universal-baseline** | 通用纪律远端执行 | security-scan + npm audit + dead-code + coverage + bundle-size + a11y-check |
| **summary** | 可视化状态卡 | 检查前 4 个 job 状态，任一失败 exit 1 |

### 7.4 通用工程模式（任何项目都能复用）

下面 6 个模式是 PR 2 的核心成果，**不限于 YoYu**——任何 Node + TypeScript 项目都可以用：

#### 模式 1：分层 Job 拓扑

```yaml
jobs:
  # ── 单元层：每个子系统单独 build ──
  frontend: ...
  backend: ...
  # ── 集成层：横切关注点 ──
  harness-gate:
    needs: [frontend, backend]            # 等单元层跑完
  universal-baseline:
    needs: [frontend, backend]
  # ── 汇总层：UI 友好状态卡 ──
  summary:
    needs: [frontend, backend, harness-gate, universal-baseline]
    if: always()                          # 关键：即使上游 fail 也跑
```

**为什么**：单元层并行跑（快），集成层依赖单元层产物（lcov、build output），汇总层永远跑（提供可视化）。

#### 模式 2：分层缓存

```yaml
- uses: actions/setup-node@v4
  with:
    cache: "npm"
    cache-dependency-path: |
      package-lock.json
      backend/package-lock.json
      frontend/package-lock.json
```

**为什么**：根 + 子项目分别缓存。CI 默认只缓存一个 lockfile，多层缓存能让 `npm ci` 命中本地缓存。

#### 模式 3：Artifact 传递

```yaml
# 上游 job：上传 lcov
- uses: actions/upload-artifact@v4
  with:
    name: backend-coverage
    path: backend/coverage/
    retention-days: 7

# 下游 job：下载 lcov + 跑 coverage 门槛
- uses: actions/download-artifact@v4
  with:
    name: backend-coverage
    path: backend/coverage/
```

**为什么**：避免下游 job 重复跑 `npm test -- --coverage`，节省 CI 时间。

#### 模式 4：Concurrency 取消

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**为什么**：同一 PR 多次 push 时，旧运行自动取消，避免资源浪费和日志混乱。

#### 模式 5：Baseline-aware 安全扫描

```bash
# scripts/security-scan.sh 里的 KNOWN_ISSUES 白名单
KNOWN_ISSUES=(
  "backend/src/main.ts:8"    # cors: true（P0 PR 6 修）
)
```

**为什么**：已知安全问题**显式记账**而不是掩盖。harness.yaml 里 `pr1_status.known_security_issues` 也同步记录，agent 读得到。新增同类问题立即阻断，修复后从白名单删除。

#### 模式 6：报告型 vs 阻断型分开

| 类型 | 例子 | 触发 | 失败时动作 |
|---|---|---|---|
| **阻断型** | ci.yml | push/PR | exit 1 → PR 红灯 |
| **报告型** | security-nightly.yml | cron | exit 0（仅发报告） |

**为什么**：深度扫描（gitleaks / outdated / full audit）启动慢 + 可能误报，不该直接阻断开发；但完全不跑又会漏掉。解法：**CI 跑浅（阻断），夜间跑深（报告）**。

### 7.5 Universal Baseline 的 6 个 CI-only 检查（关键！）

这 6 个检查是 **harness 工程的通用骨架**，不限于 YoYu 项目：

| 检查 | 工具 | 阈值 | 跑在哪 | 为什么 CI-only |
|---|---|---|---|---|
| **security-scan** | `scripts/security-scan.sh` | secrets / cors / deps | CI + nightly | 启动慢 + 不想本地拖慢 |
| **dep-audit** | `npm audit` | `--audit-level=high` | CI + nightly | 联网 + 慢 |
| **dead-code** | ts-prune | 0 个 unused export | CI only | 扫描整个仓库，慢 |
| **coverage** | lcov 解析 | ≥70% | CI only | 需要先跑测试 |
| **bundle-size** | .next 解析 | <500KB | CI only | 需要先 build |
| **a11y-check** | pa11y-ci | WCAG2AA 0 错误 | CI only（占位） | 需要 headless Chrome |

### 7.6 PR 2 验证结果

```
📊 Harness Report (5.2s)
   Mode: check:fast  Blocking: true            ← blocking 翻成 true 了
   ✅ Passed: 3  ❌ Failed: 0  ⏭️  Skipped: 0

📊 Harness Report (full report mode)
   ✅ Passed: 12  ❌ Failed: 3  ⏭️  Skipped: 1
   ✅ ref-check / i18n-check / schema-check / auth-check
   ✅ jsonb-strict-check / env-schema-check / no-console-check
   ✅ security-scan / dead-code / coverage / bundle-size / a11y-check
   ⏭️  cors-check         (PR 6 才建)
   ❌ lint / type-check / build  (需 backend deps)
```

**对比 PR 1**：3/12 → 12/15 pass。**新增 9 个 pass：4 个 universal baseline + jsonb-strict-check + security-scan**。

### 7.7 本节新增的文件

```
新增/修改：
  .github/workflows/ci.yml              ← 重写：5 job 全套 universal baseline
  .github/workflows/security-nightly.yml ← 新建：cron 深度扫描
  harness.yaml                          ← 加 dead-code/coverage/bundle-size/a11y 注册
  scripts/ts-prune-check.sh             ← 新建（universal）
  scripts/coverage-check.sh              ← 新建（universal）
  scripts/bundle-size-check.sh           ← 新建（universal）
  scripts/pa11y-check.sh                 ← 新建（universal，占位）
  scripts/security-scan.sh               ← 加 KNOWN_ISSUES 白名单机制
  scripts/harness.ts                     ← 编排器读新字段 + 改进错误消息
  package.json                           ← 加 4 个 npm 脚本 + optionalDeps
```

---

## 8. 怎么扩展 harness（教你加自己的检查）

### 7.1 加一个 check 脚本的 5 步

假设你想加一个"禁止用 var"检查：

**Step 1：写脚本**
```bash
# 在 scripts/ 下创建 no-var-check.ts
cat > scripts/no-var-check.ts << 'EOF'
#!/usr/bin/env -S npx tsx
/**
 * 文件名：no-var-check.ts（var 关键字禁用）
 * ...（中文注释）
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
// ... 扫描代码找 /^\s*var\s+\w+/g 匹配
EOF
```

**Step 2：在 harness.yaml 注册**

在 `scripts` 段加：
```yaml
no-var-check: npx tsx scripts/no-var-check.ts
```

在 `harness:check:fast` 或 `harness:check:full` 列表里加：
```yaml
harness:check:fast: [ref-check, i18n-check, schema-check, no-var-check]
```

**Step 3：在 package.json 加便捷脚本**

```json
"no-var-check": "tsx scripts/no-var-check.ts"
```

**Step 4：跑一遍验证**

```bash
npm run harness:check:fast
```

应该看到新 check 跑起来。

**Step 5：升级触发器（如果适用）**

如果这是一条"同坑复发 2 次后提炼出的规约"，在 `KNOWN_PITFALLS.md` 加一节引用。

### 7.2 加一条策略（不改代码）

比如想让 ref-check 多禁一个类 `legacy-foo-*`：

只需改 `harness.yaml`：
```yaml
policies:
  frontend:
    banned_classes:
      - water-*
      - sand-*
      - coral-*
      - legacy-foo-*      # ← 加这行
      - badge-ideal|ok|poor
      - btn-*
      - '^\.card$'
      - '^\.label$'
```

**不需要改任何 TS 文件**——下次跑 `ref-check.ts` 自动生效。这就是"配置驱动"的力量。

---

## 9. FAQ

### Q1：为什么 baseline-aware 模式不阻断？

A：PR 1 阶段发现 35 个已知违规。如果一上来就硬阻断，会导致**任何 PR 都无法合并**（包括 harness 本身的 PR）。先 baseline-aware 收集问题，让大家在后续 PR 里逐步修复，到 PR 2 CI 改造时再开闸。

### Q2：为什么 check 脚本不直接报错而用 Findings 数组？

A：可观测性优先。`process.exit(1)` 你只能看到"失败"；`Findings[]` 让你看到"哪里、为什么、怎么修"。agent 拿到结构化 findings 才能写自动化修复脚本。

### Q3：为什么有些规则 `ci_only: true`？

A：本地 commit 应该快。gitleaks / npm audit / a11y 这类扫描启动要 5+ 秒，跑在本地 commit 会让开发者烦躁。它们在 CI 集中跑一次就够。

### Q4：memory 文件和代码仓库的关系？

A：memory 是 Claude 工具的持久化层（在你机器上），不在 git 里。规则在仓库里（harness.yaml + 脚本），是公开的、版本化的。两者互补：规则是**机器读的**，memory 是**agent 第一句话读的**。

### Q5：Harness 工程和传统 CI/CD 有什么区别？

A：
- CI/CD 是**触发型**——push 时跑
- Harness 是**约束型**——定义"什么能做、什么不能做"，跨整个开发周期（commit / push / CI / 部署）
- CI/CD 是工具，Harness 是制度（用工具实现）

### Q6：这套 harness 工程能直接复用到其他项目吗？

A：`universal_baseline` 这一层（security / discipline / quality / observability / data_integrity）可以——任何项目都需要。`project_policies` 这一层需要根据项目改。`upgrade_triggers` 通用。

### Q7：发现检查脚本有 bug 怎么办？

A：
1. 在 `KNOWN_PITFALLS.md` 记下"误报案例"
2. 修脚本 + 加测试
3. 在 commit message 引用 lesson（`upgrade_triggers.script_false_positive_10pct` 触发条件）

### Q8：怎么看本地还没 commit 的代码会触发哪些违规？

A：本地跑：
```bash
npm run harness:check:fast
```
它扫整个仓库（不区分 git staged），所以能看到所有问题。

---

## 附：YoYu 项目当前 baseline 违规清单

PR 1 跑 `harness:report` 的发现（**已知违规，将在后续 PR 修复**）：

| # | 类别 | 数量 | 修复 PR |
|---|---|---|---|
| 1 | JSON.parse 散落 | 13 | P2 PR 11 |
| 2 | 前端 v3 类残留 | ~23 | P5 PR 23/24/25 |
| 3 | 禁用导入（mock） | 4 | P5 PR 26 |
| 4 | Prisma 版本注释 | 14 | P3 PR 14 |
| 5 | ja.json 缺 key | 3 | P4 PR 20 |
| 6 | ja.json 占位符错 | 1 | P4 PR 20 |
| 7 | console.log/info/warn | 8 | P5 引入 pino 后 |
| 8 | CORS 全开放 (main.ts:8) | 1 | P0 PR 6 |
| 9 | 写接口缺 @UseGuards | ~30 | P0 PR 4 |

**总计约 97 个违规**——分布在 9 个后续 PR 里修。这就是 harness 的力量：**让"该做的事"具体化、可追踪、可分批**。

---

*指南编写：YoYu Harness 工程团队 | 适用于 PR 1 完成后的学习阶段 | 下一版将加入 P0 PR 2-6 后的内容*
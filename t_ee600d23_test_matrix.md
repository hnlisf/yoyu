# YoYu D1.2.2 测试矩阵 v10.2_20260723

## 规格来源
- Kanban: t_ee600d23
- SOP-03: /root/.hermes/projects/yoyu/sop/03_i18n_strict_validation.md §2.2 D1.2.2
- BUG: /root/.hermes/projects/yoyu/bugs/BUG-V10.1.4-3-species-visualvariant-i18n-missing.md
- 架构/PRD: projects.json 所列路径不存在；以任务 body、SOP-03 和 BUG 根因文档为本任务规格来源
- GitHub base commit: 5820f96

## 测试矩阵

| # | 规格来源 | 规格描述 | 验证方法 | 验证命令 | 预期结果 | 实际结果 | PASS/FAIL |
|---|---------|---------|---------|---------|---------|---------|-----------|
| 1 | task/key_specs + arch ALLOWED_VV | color distinct 值均属于 red/orange/yellow/green/blue | SQLite JSON SQL + 脚本 | `DATABASE_URL=file:<fixture> npm run test:i18n:db` | color 100% 合规，exit 0 | | |
| 2 | task/key_specs + arch ALLOWED_VV | pattern distinct 值均属于 solid/stripe/spots/gradient/camouflage | SQLite JSON SQL + 脚本 | 同上 | pattern 100% 合规，exit 0 | | |
| 3 | task/key_specs + arch ALLOWED_VV | body distinct 值均属于 oval/diamond/streamlined/disc/elongated | SQLite JSON SQL + 脚本 | 同上 | body 100% 合规，exit 0 | | |
| 4 | BUG-V10.1.4-3 | 注入 golden/striped/round 后必须失败 | fixture + CLI | `DATABASE_URL=file:<legacy-fixture> npm run test:i18n:db` | exit 1；TSV 列出三项、次数、golden→yellow/striped→stripe/round→disc | | |
| 5 | task/迁移脚本 | 迁移三个 legacy 值 | backup + migration + validation | `DATABASE_URL=file:<legacy-fixture> npm run migrate:visualvariant && DATABASE_URL=... npm run test:i18n:db` | 迁移日志列出三映射，校验 exit 0 | | |
| 6 | task/迁移幂等 | 重复执行迁移 | migration twice + DB hash | 第二次运行迁移；比较 DB 内容 | 第二次修改 0 行；exit 0；数据不变 | | |
| 7 | task/安全 | 未知违例值不得被静默清洗 | 注入 unknown + migration + validation | 注入 purpleish 后执行迁移及校验 | 迁移不改 unknown；校验仍 exit 1 | | |
| 8 | task/坏数据 | 坏 JSON/缺字段不得漏检 | 注入 malformed/missing fixture | 运行合规脚本 | exit 1 并列出 malformed/missing；不得当作 NULL 跳过 | | |
| 9 | task/命令 | npm run test:i18n:db 可调用 | package script | `cd backend && npm run test:i18n:db` | 命令存在并执行 | | |
| 10 | task/CI | PR lint 阶段执行 D1.2.2 | workflow 静态审计 | 检查 `.github/workflows/ci.yml` 安装 backend 并执行命令 | pull_request/main 下必跑；失败阻塞 | | |
| 11 | task/build | 后端可构建 | npm build | `cd backend && npm run build` | exit 0 | | |
| 12 | task/GitHub | commit 真实存在 | GitHub REST | `GET api.github.com/repos/hnlisf/yoyu/commits/<sha>` | SHA 与 message 返回 | | |

## Review
- 覆盖任务 body 7 条 key_specs 与 6 条验收标准中可在本任务独立完成的 D1.2.2 内容。
- 新增坏 JSON/缺字段和未知值用例，防止查询把 JSON 异常或 NULL 值错误当合规。
- 本任务不运行 Playwright/dev server；D1.2.1、D1.4.2 为下游独立卡片。

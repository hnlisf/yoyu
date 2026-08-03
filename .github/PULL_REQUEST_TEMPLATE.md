<!--
PR 模板 — 强制 4 字段（harness.yaml → universal_baseline.discipline.pr_template.required_fields）

中文 / English bilingual — header 用英文（GitHub 兼容），内容可中英。
-->

## Summary 概述

<!--
一句话：这次改了什么？为什么改？
Keep concise — 1-3 sentences
-->

## SPEC Reference 规格引用

<!--
本 PR 对应 refactor/SPEC.md 的哪一节哪条 AC？
例：
- Section: §1.1 JSONB 抽象
- AC: AC-1.1.1, AC-1.1.2
- Phase: P2 / P3 / P4 / P5

无对应 SPEC → 在 "未规划 scope" 框说明
-->

- **Section**: §
- **ACs**:
- **Phase**:

## Evidence 证据

<!--
用什么证明这个 PR 完成了声称的事？
每项都有具体可复现证据（命令 + 输出 / 截图 / 链接）
-->

- [ ] `npm run harness:check:fast` exit 0
- [ ] `npm run auth-check` 0 findings（如有 controller 改动）
- [ ] `bash scripts/security-scan.sh` exit 0（如有 .ts 代码改动）
- [ ] 新测试覆盖（如添加代码）：`npm test -- <新 spec>`
- [ ] 视觉回归（如有 UI 改动）：`npm run screenshot:compare` 差异 <0.1%
- [ ] 手动 smoke：列出复现命令

### Commands run
```bash
# 实际跑过的命令 + 摘要输出（不是声称）
```

## Risk 风险评估

<!--
评级 + 简短理由
- Low: 文档/测试/无行为改动
- Medium: 重构/性能优化（行为不变）
- High: 行为变更/数据迁移/安全相关
-->

- [ ] **Risk level**: Low / Medium / High
- **Reason**:
- **Blast radius**: 影响哪些模块 / 用户 / 数据

## Rollback 回滚方案

<!--
如何撤销这个 PR？列出具体步骤
-->

### Rollback steps

```bash
# 实际可执行的回滚命令（如 git revert / migration rollback）
```

### Data impact 数据影响

<!--
是否有 migration？是否有数据删除？rollback 时数据能恢复吗？
-->

- [ ] 无数据库改动
- [ ] 有 migration — 已写反向 migration
- [ ] 有数据删除 — 备份在 [位置]

---

## PR Checklist（提交前自检）

- [ ] Commit message 符合 Conventional Commits（husky 自动校验）
- [ ] PR title 用 Conventional Commits 格式
- [ ] 改动文件数 < 400 行（或拆 PR）
- [ ] 没有未经审批的 `console.log` 残留
- [ ] 没有 hardcoded secret / API key
- [ ] SPEC.md 同步更新（如有 AC 变更）
- [ ] docs/refactor/lessons/p<N>-<topic>.md 写好（按需）

---

> 🤖 **Automated by harness engineering** —— 模板由 PR 5 创建
> 参考：`refactor/SPEC.md` + `refactor/CHECKLIST.md`
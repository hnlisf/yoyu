# YoYu BUG-V10.1.4-4 回归测试矩阵 v10.2_20260723

## 规格来源
- 任务: t_4ad8d1d8（7 个测试点）
- BUG 单: /root/.hermes/projects/yoyu/bugs/BUG-V10.1.4-4-custom-species-vv-no-effect.md
- 架构: /root/.hermes/kanban/workspaces/t_0fc5b958/YoYu_架构设计_v10_全流程重构_20260708.md（配置中的架构路径不存在，采用已找到的原始 v10 架构文档）
- PRD: 配置路径 /root/.hermes/projects/yoyu/PRD_v10.md 不存在；本任务以 task body 的 Moss 拍板规格、BUG 单和架构为准
- GitHub commit: 031673f00a62c849e70f0d6a9946bc0028bfd02f

## 测试约束
- sandbox 禁止 Playwright/dev server；视觉项采用组件逻辑的可执行静态单测/SSR SVG 渲染及 SVG 差异证据。若不能形成 3 张真实鱼卡截图，则不得宣称满足该验收项。
- D1.2.2 上游任务 t_ee600d23 当前 blocked；迁移协同项需等待其产物，不能擅自 PASS。

## 测试矩阵

| # | 规格来源 | 规格描述 | 验证方法 | 验证命令 | 预期结果 | 实际结果 | PASS/FAIL |
|---|---|---|---|---|---|---|---|
| 1 | 老板 WSL 实测 | red + stripe + oval | 源码链路 + 可执行渲染证据 | 检查创建 payload、API DTO/service、page 校验、CustomFishSVG 输出；渲染组合 A SVG | 红色、条纹、椭圆对应属性进入 SVG | | |
| 2 | 老板 WSL 实测 | blue + spots + elongated | 同上 | 渲染组合 B SVG 并检查 fill/pattern/body path | 蓝色、斑点、长条对应属性进入 SVG | | |
| 3 | 3 种对比 | 三种不同组合视觉明显不同 | SVG 哈希/结构差异 + 3 张证据图 | 渲染 A/B/C，比较 hash/path/pattern 并生成证据 | 3 份输出明显不同 | | |
| 4 | 不再 fallback | 非法 legacy vv golden/striped/round | 函数边界测试 + 渲染调用链审计 | 非法 vv 判 false；FishAvatar 收到 null，显式走 variant fallback | 不把非法 vv 送入 CustomFishSVG；有显式 fallback | | |
| 5 | i18n D1.2.2 协同 | 迁移后无新违例值 | 运行上游迁移/DB 合规测试后复测 | 定位并运行 DB compliance 脚本，确认数据库 100% 合规 | 迁移成功，0 违例 | | |
| 6 | 视觉断言 | 3 种鱼差异明显、无乱码 | 轻量 SVG 渲染 + 图像审查 | 生成 3 张 PNG，vision_analyze 对比 | 差异明显，无 ⊠□/key 字面 | | |
| 7 | 兜底方案文档 | 代码注释说明渲染层兜底 | grep + 上下文审计 | 搜索 BUG-V10.1.4-4、defensive、fallback 注释 | 注释存在且与实现一致 | | |
| 8 | GitHub 真实性 | commit 与 parent chain 正确 | api.github.com REST + local git | GET commits/031673f；比较 SHA、parents、files | SHA 完整匹配，单 parent b7fb17e，变更目标文件正确 | | |
| 9 | 构建门禁 | frontend build 通过 | npm install/build | npm install && npm run build | exit 0 | | |

## Review 自检
- 已覆盖 task body 全部 7 项及额外 GitHub/build 门禁。
- 路由 `/species` 将同时验证源码文件存在和 build output 路由，不只做字面 grep。
- 任何一项 FAIL/PARTIAL 均不判整体验收 PASS。

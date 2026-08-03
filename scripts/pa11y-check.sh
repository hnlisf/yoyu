#!/usr/bin/env bash
# ============================================================================
# 文件名：pa11y-check.sh（无障碍检查器，CI-only）
# ============================================================================
# 作用：跑 pa11y-ci 扫描 harness.yaml 指定的页面的无障碍问题
#
# 工具：pa11y-ci（npm 包，基于 pa11y + axe-core）
# 原理：用 headless Chrome 渲染页面，运行 axe-core WCAG 2.1 AA 规则
#
# 为什么 CI-only：
#   需要启动 frontend dev server + headless Chrome —— 启动慢
#   pa11y 不适合跑在本地 pre-commit
#
# 当前状态：pa11y-ci 未在 devDeps（PR 2 占位 — 后续 PR 引入）
#   本脚本检测到 pa11y-ci 缺失时输出 INFO 而非 FAIL
#
# 用法：
#   1. 在 .pa11y-ci.json 配置目标 URL + 标准
#   2. CI 中：先启 frontend dev server，再跑本脚本
#
# 配置参考（.pa11y-ci.json）：
#   {
#     "defaults": { "standard": "WCAG2AA" },
#     "urls": ["http://localhost:3001/zh/tanks", ...]
#   }
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "━━━ pa11y-check: 无障碍扫描 ━━━"

# 1) 检查工具是否安装
if ! npm ls pa11y-ci &> /dev/null; then
  echo "⚠️  pa11y-ci 未安装（PR 后续阶段引入）"
  echo "   当前状态：占位脚本，no-op 退出 0"
  exit 0
fi

# 2) 检查配置
if [ ! -f "$REPO_ROOT/.pa11y-ci.json" ]; then
  echo "❌ .pa11y-ci.json 缺失"
  exit 2
fi

# 3) 跑 pa11y-ci（需要 dev server 已启动）
echo "   跑 pa11y-ci（超时 120s）..."
timeout 120 npx pa11y-ci 2>&1 || {
  EXIT=$?
  echo "❌ pa11y-ci 失败（exit $EXIT）"
  exit $EXIT
}

echo "✅ pa11y 通过"
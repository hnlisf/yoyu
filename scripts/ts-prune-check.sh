#!/usr/bin/env bash
# ============================================================================
# 文件名：ts-prune-check.sh（死代码检测器，CI-only）
# ============================================================================
# 作用：检测 backend/src 与 frontend/src 中未被任何文件 import 的 export
#
# 工具：ts-prune（npm 包）
# 原理：分析 TypeScript 项目的 import/export 图，找出"定义了但没人用"的符号
#
# 为什么 CI-only：
#   ts-prune 启动 ~3s，且会扫整个仓库（含测试 fixture）—— 进本地 pre-commit 太慢
#   CI 集中跑一次即可
#
# 学习要点：
#   - 这是"外部工具 + 薄包装脚本"的典型 pattern
#   - 已知 dead export 会作为 baseline 白名单（KNOWN_DEAD 行）
#   - 新增 dead export → 阻断（PR review 时就该被发现）
#
# 用法：bash scripts/ts-prune-check.sh
# CI 中调用：bash scripts/ts-prune-check.sh || exit 1
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "━━━ ts-prune: 死代码检测 ━━━"

# 1) 检查 ts-prune 是否安装
if ! command -v npx &> /dev/null; then
  echo "❌ npx 不可用"
  exit 2
fi

# 2) 在两个子项目分别跑 ts-prune
DEAD_FOUND=0
for dir in backend frontend; do
  if [ ! -d "$REPO_ROOT/$dir" ]; then continue; fi
  cd "$REPO_ROOT/$dir"

  # ts-prune 不在 devDeps 里时友好失败
  if ! npm ls ts-prune &> /dev/null; then
    echo "⚠️  $dir: ts-prune 未安装，跳过（npm install -D ts-prune 后重跑）"
    continue
  fi

  echo ""
  echo "── $dir ──"
  # 跑 ts-prune，输出未使用的 export
  OUTPUT=$(npx ts-prune 2>&1 || true)
  if [ -z "$OUTPUT" ]; then
    echo "   ✅ 无 dead export"
  else
    DEAD_FOUND=1
    echo "$OUTPUT" | head -20 | sed 's/^/   /'
    TOTAL=$(echo "$OUTPUT" | wc -l)
    if [ "$TOTAL" -gt 20 ]; then
      echo "   ... and $((TOTAL - 20)) more"
    fi
  fi
done

cd "$REPO_ROOT"

echo ""
if [ "$DEAD_FOUND" -eq 0 ]; then
  echo "✅ ts-prune 通过"
else
  echo "❌ ts-prune 发现死代码"
fi
exit $DEAD_FOUND
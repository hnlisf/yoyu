#!/usr/bin/env bash
# ============================================================================
# 文件名：coverage-check.sh（覆盖率门槛检查器，CI-only）
# ============================================================================
# 作用：解析 backend + frontend 的 lcov.info，强制全局行覆盖率 ≥ 阈值
#
# 工具：自实现（awk 解析 lcov）+ 配置阈值来自 harness.yaml
# 原理：lcov.info 格式是文本，每行 "DA:<line>,<count>" 标记某行是否被执行
#       统计 "DA:...,0" 行数 / 总 "DA:" 行数 = 未覆盖行比例
#
# 为什么 CI-only：
#   需要先跑测试产出 lcov（backend: jest --coverage；frontend: vitest --coverage）
#   本地跑会拖慢 commit 节奏
#
# 学习要点：
#   - 这是"配置驱动 + 简单解析"的典型 pattern（不需要 node 解析 lcov JSON）
#   - 阈值从 harness.yaml → universal_baseline.quality.coverage_threshold.global_min 读取
#   - 当前阈值：70%（YoYu 项目从 0% 开始，会自然涨上来）
#
# 用法：先跑测试产出 lcov，再跑本脚本
#   cd backend && npm test -- --coverage
#   bash scripts/coverage-check.sh
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# 从 harness.yaml 读阈值（默认 70）
THRESHOLD=70
if [ -f "harness.yaml" ] && command -v node &> /dev/null; then
  READ=$(node -e "
    const yaml = require('yaml');
    const fs = require('fs');
    try {
      const cfg = yaml.parse(fs.readFileSync('harness.yaml', 'utf8'));
      const t = cfg?.universal_baseline?.quality?.coverage_threshold?.global_min;
      if (typeof t === 'number') process.stdout.write(String(t));
    } catch (e) { process.exit(0); }
  " 2>/dev/null || true)
  if [ -n "$READ" ]; then
    THRESHOLD="$READ"
  fi
fi

echo "━━━ coverage-check: 行覆盖率门槛 ${THRESHOLD}% ━━━"

TOTAL_FOUND=0
TOTAL_HIT=0

# 1) backend lcov
for lcov in backend/coverage/lcov.info backend/lcov.info frontend/coverage/lcov.info frontend/coverage/lcov-final.info; do
  if [ ! -f "$REPO_ROOT/$lcov" ]; then continue; fi
  echo ""
  echo "── $lcov ──"

  # awk 解析：DA:<line>,<exec_count>
  # LF:<lines_found>  LH:<lines_hit>
  # 总命中：sum(LF) sum(LH)
  STATS=$(awk -F: '
    /^LF:/ { lf_sum += $2 }
    /^LH:/ { lh_sum += $2 }
  END { printf "%d %d\n", lf_sum+0, lh_sum+0 }
  ' "$REPO_ROOT/$lcov")
  LF=$(echo "$STATS" | cut -d' ' -f1)
  LH=$(echo "$STATS" | cut -d' ' -f2)
  if [ "$LF" -eq 0 ]; then
    echo "   ⚠️  LF=0（可能未跑 coverage）"
    continue
  fi
  PCT=$(awk -v lh="$LH" -v lf="$LF" 'BEGIN { printf "%.1f", (lh/lf)*100 }')
  echo "   LH/LF = $LH/$LF = ${PCT}%"

  TOTAL_FOUND=$((TOTAL_FOUND + LF))
  TOTAL_HIT=$((TOTAL_HIT + LH))
done

echo ""
if [ "$TOTAL_FOUND" -eq 0 ]; then
  echo "⚠️  未找到 lcov.info 文件（需先跑测试：npm test -- --coverage）"
  echo "   CI 配置：参见 .github/workflows/ci.yml"
  exit 0  # 视为 info，不阻断（CI 中会先生成 lcov）
fi

TOTAL_PCT=$(awk -v lh="$TOTAL_HIT" -v lf="$TOTAL_FOUND" 'BEGIN { printf "%.1f", (lh/lf)*100 }')
echo "━━ 总计：$TOTAL_HIT / $TOTAL_FOUND = ${TOTAL_PCT}% (门槛 ${THRESHOLD}%) ━━"

# 用 awk 比较（避免 bc 依赖）
EXCEEDS=$(awk -v pct="$TOTAL_PCT" -v th="$THRESHOLD" 'BEGIN { print (pct+0 >= th+0) ? 1 : 0 }')
if [ "$EXCEEDS" -eq 1 ]; then
  echo "✅ coverage 通过（${TOTAL_PCT}% ≥ ${THRESHOLD}%）"
  exit 0
else
  echo "❌ coverage 不达标（${TOTAL_PCT}% < ${THRESHOLD}%）"
  exit 1
fi
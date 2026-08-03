#!/usr/bin/env bash
# ============================================================================
# 文件名：bundle-size-check.sh（前端 bundle 体积检查器，CI-only）
# ============================================================================
# 作用：构建 frontend 后，检查 .next/static/chunks/ 下所有 JS 总大小 < 阈值
#
# 工具：自实现（find + du）+ 阈值来自 harness.yaml
# 原理：Next.js 把 client-side JS 编译到 .next/static/chunks/*.js
#       总和超过阈值 → 阻断（防止功能膨胀失控）
#
# 为什么 CI-only：
#   需要先 npm run build（耗时长）
#   本地 commit 阶段跑不现实
#
# 学习要点：
#   - 这是"产物大小监控"的轻量实现（不需要 webpack-bundle-analyzer）
#   - 与 Lighthouse / bundlesize 是同一类问题的不同解
#   - YoYu 当前阈值：500KB（harness.yaml → universal_baseline.quality.bundle_size_frontend.max_kb）
#
# 用法：先 build frontend，再跑本脚本
#   cd frontend && npm run build
#   bash scripts/bundle-size-check.sh
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# 从 harness.yaml 读阈值（默认 500KB）
MAX_KB=500
if [ -f "harness.yaml" ] && command -v node &> /dev/null; then
  READ=$(node -e "
    const yaml = require('yaml');
    const fs = require('fs');
    try {
      const cfg = yaml.parse(fs.readFileSync('harness.yaml', 'utf8'));
      const m = cfg?.universal_baseline?.quality?.bundle_size_frontend?.max_kb;
      if (typeof m === 'number') process.stdout.write(String(m));
    } catch (e) { process.exit(0); }
  " 2>/dev/null || true)
  if [ -n "$READ" ]; then
    MAX_KB="$READ"
  fi
fi

echo "━━━ bundle-size-check: 前端 chunks 总大小阈值 ${MAX_KB}KB ━━━"

# 1) 检查 .next/static/chunks 是否存在
CHUNKS_DIR="$REPO_ROOT/frontend/.next/static/chunks"
if [ ! -d "$CHUNKS_DIR" ]; then
  echo "⚠️  ${CHUNKS_DIR} 不存在（需先跑 cd frontend && npm run build）"
  echo "   CI 配置：参见 .github/workflows/ci.yml"
  exit 0  # 不阻断（CI 中会先生成）
fi

# 2) 累加所有 .js 体积（KB）
TOTAL_BYTES=$(find "$CHUNKS_DIR" -type f -name "*.js" -printf "%s\n" 2>/dev/null | awk '{sum += $1} END {print sum+0}')
TOTAL_KB=$(awk -v b="$TOTAL_BYTES" 'BEGIN { printf "%.1f", b/1024 }')

# 3) 列出 Top 5 最大的 chunk（诊断用）
echo ""
echo "── Top 5 最大 chunks ──"
find "$CHUNKS_DIR" -type f -name "*.js" -printf "%s %p\n" 2>/dev/null | \
  sort -rn | head -5 | \
  awk '{ printf "   %.1f KB  %s\n", $1/1024, $2 }' | sed "s|$CHUNKS_DIR/||"

echo ""
echo "━━ 总计：${TOTAL_KB}KB (阈值 ${MAX_KB}KB) ━━"

EXCEEDS=$(awk -v actual="$TOTAL_KB" -v max="$MAX_KB" 'BEGIN { print (actual+0 > max+0) ? 1 : 0 }')
if [ "$EXCEEDS" -eq 1 ]; then
  echo "❌ bundle 超过阈值（${TOTAL_KB}KB > ${MAX_KB}KB）"
  exit 1
else
  echo "✅ bundle 通过（${TOTAL_KB}KB ≤ ${MAX_KB}KB）"
  exit 0
fi
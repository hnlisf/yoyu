#!/usr/bin/env bash
# ============================================================================
# 文件名：security-scan.sh（安全扫描脚本，bash 版）
# ============================================================================
# 作用：扫描 4 类安全问题（gitleaks 不可用时的 grep 兜底实现）
#
# 检查项：
#   1. .env / *.pem / *.key / secrets.{json,yml} 是否被 git 追踪
#   2. 代码中可能的硬编码 secret（AWS / GitHub PAT / JWT / OpenAI 风格）
#   3. 后端 CORS 配置（禁 cors: true 全开放）
#   4. 依赖完整性（npm ls 看 invalid/UNMET）
#
# 与 .ts 脚本的区别：
#   - bash 写更简洁（grep/sed/exit code）
#   - 不需要 npm 依赖（适合 CI 容器最小化）
#   - 跨平台能力弱（仅 bash/zsh，Windows 需 WSL 或 Git Bash）
#
# Known Issues 白名单机制（PR 2 引入）：
#   - KNOWN_ISSUES 数组列出当前已知但暂不阻断的安全问题
#   - 每个 issue 描述"哪里 + 原因"（如哪个 PR 修）
#   - 命中白名单的发现只 WARNING，不阻断
#   - **不在白名单的同类型发现** 仍然阻断（防止新增）
#   - 白名单清空 → 进入"零容忍"模式
#
# 用法：bash scripts/security-scan.sh
# CI 中调用：bash scripts/security-scan.sh  → 失败 exit 1 阻断 PR
# ============================================================================

# ---------------------------------------------------------------------------
# Known Issues 白名单（PR 2 引入的"显式债"追踪）
# 格式：每条是 file:line 前缀，命中即跳过（不阻断）
# 完整描述放在 harness.yaml → pr1_status.known_security_issues（agent 读得到）
#
# PR 6 进展：backend/src/main.ts:8 的 cors: true 已修复，
#   KNOWN_ISSUES 已清空。universal_baseline.security 全部完成。
# 后续若发现新债，按以下格式登记：
#   "path/to/file.ts:LINE"   # 简短描述 + 修复 PR
# ---------------------------------------------------------------------------
KNOWN_ISSUES=()
# 转成 grep pattern（用 file:line 前缀匹配，容忍空格分隔）
KNOWN_PATTERN=$(printf '%s|' "${KNOWN_ISSUES[@]}")
KNOWN_PATTERN="${KNOWN_PATTERN%|}"

# 工具：判断某行是否在白名单（只要 file:line 命中即跳过）
is_known() {
  local line="$1"
  # 空 pattern 让 grep 直接 return 1（不命中），即"非白名单"
  if [ -z "$KNOWN_PATTERN" ]; then return 1; fi
  echo "$line" | grep -qE "$KNOWN_PATTERN"
}

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

EXIT_CODE=0

# 1) 检查 .env / *.pem / *.key 是否被追踪
echo "━━━ security-scan: .env / 密钥文件 ━━━"
SENSITIVE_FILES=$(git ls-files 2>/dev/null | grep -E '^\.env$|\.env\.local$|\.pem$|\.key$|\.p12$|secrets\.(json|ya?ml)$' || true)
if [ -n "$SENSITIVE_FILES" ]; then
  echo "❌ 敏感文件被 git 追踪："
  echo "$SENSITIVE_FILES" | sed 's/^/   /'
  EXIT_CODE=1
else
  echo "   ✅ 无敏感文件被追踪"
fi

# 2) 代码中可能的硬编码 secret
echo ""
echo "━━━ security-scan: 硬编码 secret pattern ━━━"
SECRET_PATTERNS=(
  'AKIA[0-9A-Z]{16}'                       # AWS access key
  'sk-[a-zA-Z0-9]{20,}'                    # OpenAI-style
  'ghp_[a-zA-Z0-9]{36}'                    # GitHub PAT
  'eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+'   # JWT-like
)

HARDCODED_FOUND=0
for pat in "${SECRET_PATTERNS[@]}"; do
  HITS=$(grep -rEn "$pat" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.json' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=.next --exclude=package-lock.json backend frontend scripts 2>/dev/null || true)
  if [ -n "$HITS" ]; then
    echo "❌ 可能的硬编码 secret（pattern: $pat）："
    echo "$HITS" | head -5 | sed 's/^/   /'
    HARDCODED_FOUND=1
  fi
done
if [ "$HARDCODED_FOUND" -eq 0 ]; then
  echo "   ✅ 无明显硬编码 secret"
fi

# 3) 后端 CORS 配置
echo ""
echo "━━━ security-scan: CORS 配置 ━━━"
# 用 grep -rn 但排除注释行（// 或 *）
# filter 模式：匹配 `file:line:` 后跟可选空格再跟 `//` 或 `*`
# 这避免 main.ts 的注释 "  // ── PR 6 修复：cors: true →..." 被误判
CORS_HITS=$(grep -rn 'cors:\s*true' backend/src/ 2>/dev/null \
  | grep -vE ':[[:space:]]*//' \
  | grep -vE ':[[:space:]]*\*' \
  || true)
if [ -n "$CORS_HITS" ]; then
  NEW_CORS_HITS=""
  while IFS= read -r line; do
    if is_known "$line"; then
      echo "⚠️  已知白名单：$line（不在阻断范围）"
    else
      NEW_CORS_HITS+="$line"$'\n'
    fi
  done <<< "$CORS_HITS"
  if [ -n "$NEW_CORS_HITS" ]; then
    echo "❌ 发现新的 'cors: true'（不在白名单，阻断）："
    echo "$NEW_CORS_HITS" | sed 's/^/   /'
    echo "   建议改为 cors: { origin: env.ALLOWED_ORIGINS.split(',') }"
    EXIT_CODE=1
  else
    echo "   ✅ 无新增 cors: true（白名单命中不算）"
  fi
else
  echo "   ✅ 无 cors: true 全开放"
fi

# 4) 危险依赖（粗略——npm audit 会更精确）
echo ""
echo "━━━ security-scan: 依赖版本（粗略） ━━━"
cd backend && npm ls --depth=0 2>/dev/null | grep -E 'invalid|UNMET' | head -5 | sed 's/^/   /' || echo "   ✅ 后端依赖 OK"
cd ../frontend && npm ls --depth=0 2>/dev/null | grep -E 'invalid|UNMET' | head -5 | sed 's/^/   /' || echo "   ✅ 前端依赖 OK"
cd "$REPO_ROOT"

echo ""
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✅ security-scan 通过"
else
  echo "❌ security-scan 发现问题（exit $EXIT_CODE）"
fi
exit $EXIT_CODE
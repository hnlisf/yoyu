#!/usr/bin/env bash
#
# WSL one-click environment setup for YoYu project
# Usage: bash <(curl -fsSL https://raw.githubusercontent.com/hnlisf/yoyu/main/scripts/wsl-install.sh)
# Requires: WSL Ubuntu 22.04
#
set -e

# ─── Colour helpers ───────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[OK]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[FAIL]${NC}  $*" >&2; }
need()  { error "$*"; exit 1; }

# ─── Detect ───────────────────────────────────────────────────────────────────
IS_WSL=false
if grep -qi 'microsoft\|wsl' /proc/version 2>/dev/null; then
  IS_WSL=true
  info "WSL detected"
fi

# ─── Helper: is_command ───────────────────────────────────────────────────────
is_cmd() { command -v "$1" >/dev/null 2>&1; }

# ─── Helper: ensure_dir ───────────────────────────────────────────────────────
ensure_dir() {
  if [ -d "$1" ]; then
    warn "Already exists, skipping: $1"
    return 1
  fi
  return 0
}

# ─── Helper: run_or_skip ─────────────────────────────────────────────────────
run_or_skip() {
  local label="$1"; shift
  if "$@"; then
    info "$label"
    return 0
  else
    warn "$label (skipped)"
    return 1
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "🟩 WSL one-click environment setup — YoYu"
echo "────────────────────────────────────────────"
echo ""

# ─── 1. System packages ───────────────────────────────────────────────────────
echo "🟩 [1/9] System packages (git curl jq zsh fontconfig)..."
if is_cmd git && is_cmd curl && is_cmd jq && is_cmd zsh && is_cmd fc-cache; then
  warn "All system packages already present"
else
  sudo apt-get update -qq
  sudo apt-get install -y -qq git curl jq zsh fontconfig > /dev/null 2>&1
  info "System packages installed"
fi

# ─── 2. nvm ───────────────────────────────────────────────────────────────────
echo "🟩 [2/9] nvm..."
export NVM_DIR="$HOME/.nvm"
if [ -d "$NVM_DIR/nvm.sh" ]; then
  warn "nvm already installed, sourcing..."
else
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash > /dev/null 2>&1
  info "nvm installed"
fi
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm --version > /dev/null 2>&1 && info "nvm sourced" || warn "nvm not in PATH yet (re-login will fix)"

# ─── 3. Node.js 20.x LTS ─────────────────────────────────────────────────────
echo "🟩 [3/9] Node.js 20.x LTS..."
if is_cmd node; then
  NODE_VER=$(node --version)
  warn "Node.js already present: $NODE_VER"
else
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm install 20 --lts > /dev/null 2>&1
  nvm alias default 20 > /dev/null 2>&1
  info "Node.js 20.x LTS installed"
fi

# ─── 4. yarn 1.22 ─────────────────────────────────────────────────────────────
echo "🟩 [4/9] yarn 1.22..."
if is_cmd yarn; then
  warn "yarn already present: $(yarn --version)"
else
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm exec 20 corepack enable > /dev/null 2>&1
  nvm exec 20 corepack prepare yarn@1.22 --activate > /dev/null 2>&1
  info "yarn 1.22 installed"
fi

# ─── 5. Playwright + chromium ─────────────────────────────────────────────────
echo "🟩 [5/9] Playwright + chromium..."
if yarn global list --depth=0 2>/dev/null | grep -q 'playwright'; then
  warn "Playwright already installed"
else
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm exec 20 yarn global add playwright > /dev/null 2>&1
  nvm exec 20 npx playwright install chromium > /dev/null 2>&1
  info "Playwright + chromium installed"
fi

# ─── 6. noto-cjk fonts ─────────────────────────────────────────────────────────
echo "🟩 [6/9] noto-cjk fonts..."
NOTO_INSTALLED=false
if fc-list :lang=zh 2>/dev/null | grep -qi 'noto'; then
  NOTO_INSTALLED=true
  warn "noto-cjk already installed"
fi

if ! $NOTO_INSTALLED; then
  # Try Google Fonts package first (most reliable on WSL)
  if ! dpkg -l | grep -q 'google-fonts-noto\|fonts-noto-cjk'; then
    sudo apt-get install -y -qq fonts-noto-cjk > /dev/null 2>&1 && NOTO_INSTALLED=true
  else
    NOTO_INSTALLED=true
  fi
fi

if $NOTO_INSTALLED; then
  sudo fc-cache -fv > /dev/null 2>&1
  info "noto-cjk installed and font cache refreshed"
else
  warn "noto-cjk install failed — Chinese characters may show as tofu 🟥"
fi

# ─── 7. fontconfig fallback (WSL) ─────────────────────────────────────────────
echo "🟩 [7/9] fontconfig fallback for WSL..."
FC_CONF_DIR="$HOME/.config/fontconfig"
FC_CONF="$FC_CONF_DIR/fonts.conf"
mkdir -p "$FC_CONF_DIR"
if [ -f "$FC_CONF" ]; then
  warn "fontconfig already configured"
else
  cat > "$FC_CONF" << 'FONTCONF'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <description>WSL font fallback for Chinese</description>
  <match target="pattern">
    <test name="lang" compare="contains">
      <string>zh</string>
    </test>
    <edit name="family" mode="prepend">
      <string>Noto Sans CJK SC</string>
    </edit>
  </match>
</fontconfig>
FONTCONF
  fi
  info "fontconfig fallback configured"

# ─── 8. oh-my-zsh (unattended) ────────────────────────────────────────────────
echo "🟩 [8/9] oh-my-zsh..."
if [ -d "$HOME/.oh-my-zsh" ]; then
  warn "oh-my-zsh already present"
else
  export CI=true
  export RUNZSH=no
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended > /dev/null 2>&1
  info "oh-my-zsh installed"
fi

# ─── 9. Verify ─────────────────────────────────────────────────────────────────
echo "🟩 [9/9] Verification..."
VERIFAIL=false

node --version > /dev/null 2>&1 || { error "node missing"; VERIFAIL=true; }
yarn --version > /dev/null 2>&1 || { error "yarn missing"; VERIFAIL=true; }
if ! fc-list :lang=zh 2>/dev/null | grep -qi 'noto'; then
  error "noto-cjk fonts not found"
  VERIFAIL=true
fi

if $VERIFAIL; then
  echo ""
  error "Verification FAILED — fix errors above and re-run"
  exit 1
fi

info "All verifications passed"
echo ""
echo "────────────────────────────────────────────"
echo -e "${GREEN}WSL ready: run 'bash yoyu/scripts/dev.sh'${NC}"
echo ""

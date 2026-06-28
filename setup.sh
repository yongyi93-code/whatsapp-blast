#!/usr/bin/env bash
#
# whatsappblast 一键安装脚本（macOS）
# 在新 Mac 上把环境装好：Node ≥ 18 + 项目依赖 + 浏览器。
# 用法：cd 到项目目录后执行  bash setup.sh
#
set -euo pipefail

# 切到脚本所在目录，保证在项目根运行
cd "$(dirname "$0")"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
info()  { printf "${GREEN}==>${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}!! ${NC} %s\n" "$1"; }
err()   { printf "${RED}xx ${NC} %s\n" "$1"; }

printf "${BOLD}whatsappblast 安装程序（macOS）${NC}\n\n"

# 仅支持 macOS（本脚本按计划只覆盖 Mac）
if [ "$(uname)" != "Darwin" ]; then
  err "此脚本仅用于 macOS。其他系统请参考 README 手动安装。"
  exit 1
fi

# ---------- 1. 确保 Node ≥ 18 ----------
need_node=false
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$major" -ge 18 ]; then
    info "已检测到 Node $(node -v)，满足要求（≥ 18）。"
  else
    warn "Node 版本过低（$(node -v)），需要 ≥ 18，将升级。"
    need_node=true
  fi
else
  warn "未检测到 Node，将安装。"
  need_node=true
fi

if [ "$need_node" = true ]; then
  if ! command -v brew >/dev/null 2>&1; then
    warn "未检测到 Homebrew，先安装 Homebrew（需要联网，可能要求输入密码）……"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # 让当前 shell 能找到 brew（Apple 芯片在 /opt/homebrew，Intel 在 /usr/local）
    if [ -x /opt/homebrew/bin/brew ]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x /usr/local/bin/brew ]; then
      eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi
  info "用 Homebrew 安装 Node……"
  brew install node
  info "Node 安装完成：$(node -v)"
fi

# ---------- 2. 安装项目依赖（会下载 Chromium，需联网） ----------
info "安装依赖（npm install，首次会下载 Chromium，请耐心等待）……"
npm install
info "依赖安装完成。"

# ---------- 3. 浏览器检查 ----------
# 注意：在 macOS 上 src/config.js 默认用系统 Google Chrome 启动 WhatsApp。
CHROME_APP="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ -x "$CHROME_APP" ]; then
  info "已检测到系统 Google Chrome，将默认使用它。"
else
  warn "未检测到系统 Google Chrome（macOS 默认用它启动）。两种解决方式："
  printf "   ${BOLD}A.${NC} 安装 Chrome（推荐）：  brew install --cask google-chrome\n"
  printf "   ${BOLD}B.${NC} 改用自带 Chromium 启动：  CHROME_PATH=\"\" npm start\n"
fi

# ---------- 完成 ----------
printf "\n${GREEN}${BOLD}安装完成！${NC}\n"
printf "下一步：\n"
printf "  1. 启动服务：   ${BOLD}npm start${NC}\n"
printf "  2. 浏览器打开： ${BOLD}http://localhost:3000${NC}\n"
printf "  3. 手机 WhatsApp 扫码登录（设置 → 已关联的设备 → 关联设备）。\n"

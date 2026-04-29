#!/bin/bash

# OpenAgents 安装脚本 (Linux/macOS)
# 使用方法: curl -fsSL https://raw.githubusercontent.com/zhangjiabo522/openagents/main/install.sh | bash

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           Welcome to OpenAgents Installer                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装。"
    echo "请先安装 Node.js 18+: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低 (当前: $(node -v))"
    echo "请升级到 Node.js 18+"
    exit 1
fi

echo "✓ Node.js $(node -v) 已安装"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装。"
    exit 1
fi

echo "✓ npm $(npm -v) 已安装"

# 安装 openagents
echo ""
echo "📦 正在安装 openagents..."
npm install -g openagents

# 验证安装
if command -v openagents &> /dev/null; then
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║           ✅ OpenAgents 安装成功!                        ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "使用方法:"
    echo "  openagents           # 启动交互式会话"
    echo "  openagents config init  # 初始化配置文件"
    echo "  openagents --help    # 查看帮助"
    echo ""
    echo "首次使用请先配置 API Provider:"
    echo "  openagents config init"
    echo "  然后编辑 ~/.openagents/config.yaml 添加你的 API Key"
else
    echo "❌ 安装失败，请检查错误信息。"
    exit 1
fi

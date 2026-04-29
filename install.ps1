# OpenAgents 安装脚本 (Windows PowerShell)
# 使用方法: irm https://raw.githubusercontent.com/zhangjiabo522/openagents/main/install.ps1 | iex

$REPO_URL = "https://github.com/zhangjiabo522/openagents.git"
$INSTALL_DIR = "$env:USERPROFILE\.openagents-cli"

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           Welcome to OpenAgents Installer                ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "❌ Node.js 未安装。" -ForegroundColor Red
    Write-Host "请先安装 Node.js 18+: https://nodejs.org/"
    exit 1
}

$nodeVersion = (node -v) -replace 'v', '' -split '\.' | Select-Object -First 1
if ([int]$nodeVersion -lt 18) {
    Write-Host "❌ Node.js 版本过低 (当前: $(node -v))" -ForegroundColor Red
    Write-Host "请升级到 Node.js 18+"
    exit 1
}

Write-Host "✓ Node.js $(node -v) 已安装" -ForegroundColor Green

# 检查 npm
$npmPath = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmPath) {
    Write-Host "❌ npm 未安装。" -ForegroundColor Red
    exit 1
}

Write-Host "✓ npm $(npm -v) 已安装" -ForegroundColor Green

# 检查 git
$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath) {
    Write-Host "❌ git 未安装。" -ForegroundColor Red
    Write-Host "请先安装 git: https://git-scm.com/"
    exit 1
}

Write-Host "✓ git $(git --version | Select-String -Pattern '[\d.]+' | ForEach-Object { $_.Matches.Value }) 已安装" -ForegroundColor Green

# 克隆仓库
Write-Host ""
Write-Host "📦 正在从 GitHub 克隆 openagents..." -ForegroundColor Yellow
if (Test-Path $INSTALL_DIR) {
    Remove-Item -Recurse -Force $INSTALL_DIR
}
git clone --depth 1 $REPO_URL $INSTALL_DIR

# 安装依赖
Write-Host ""
Write-Host "📦 正在安装依赖..." -ForegroundColor Yellow
Set-Location $INSTALL_DIR
npm install --production

# 全局链接
Write-Host ""
Write-Host "🔗 正在注册全局命令..." -ForegroundColor Yellow
npm link

# 验证安装
$openagentsPath = Get-Command openagents -ErrorAction SilentlyContinue
if ($openagentsPath) {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║           ✅ OpenAgents 安装成功!                        ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  openagents              # 启动交互式会话（首次会自动引导配置）"
    Write-Host "  openagents config init  # 交互式配置 API Provider 和模型"
    Write-Host "  openagents agents       # 查看已配置的 Agent"
    Write-Host "  openagents session list # 查看历史会话"
    Write-Host "  openagents uninstall    # 卸载程序"
    Write-Host "  openagents --help       # 查看帮助"
    Write-Host ""
    Write-Host "首次运行 openagents 时会自动引导你配置 API Provider。" -ForegroundColor Yellow
} else {
    Write-Host "❌ 安装失败，请检查错误信息。" -ForegroundColor Red
    exit 1
}

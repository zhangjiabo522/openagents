# OpenAgents 安装脚本 (Windows PowerShell)
# 使用方法: irm https://raw.githubusercontent.com/zhangjiabo522/openagents/main/install.ps1 | iex

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

# 安装 openagents
Write-Host ""
Write-Host "📦 正在安装 openagents..." -ForegroundColor Yellow
npm install -g openagents

# 验证安装
$openagentsPath = Get-Command openagents -ErrorAction SilentlyContinue
if ($openagentsPath) {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║           ✅ OpenAgents 安装成功!                        ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  openagents              # 启动交互式会话"
    Write-Host "  openagents config init  # 初始化配置文件"
    Write-Host "  openagents --help       # 查看帮助"
    Write-Host ""
    Write-Host "首次使用请先配置 API Provider:" -ForegroundColor Yellow
    Write-Host "  openagents config init"
    Write-Host "  然后编辑 ~/.openagents/config.yaml 添加你的 API Key"
} else {
    Write-Host "❌ 安装失败，请检查错误信息。" -ForegroundColor Red
    exit 1
}

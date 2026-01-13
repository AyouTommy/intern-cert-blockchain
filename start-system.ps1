# 高校实习证明上链系统启动脚本
# 使用方法: .\start-system.ps1

$ErrorActionPreference = "Continue"

# 配置
$PROJECT_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.PrefixOrigin -ne "WellKnown" } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   高校实习证明上链系统 - 启动脚本" -ForegroundColor Cyan  
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "本机IP地址: $IP" -ForegroundColor Yellow
Write-Host ""

# 设置环境变量
$env:DATABASE_URL = "mysql://root:123456@localhost:3306/internship_certificate_db"
$env:FRONTEND_URL = "http://${IP}:5173"
$env:VERIFY_BASE_URL = "http://${IP}:5173/verify/public"
$env:JWT_SECRET = "your-super-secret-jwt-key-change-in-production"
$env:BLOCKCHAIN_RPC_URL = "http://127.0.0.1:8545"

Write-Host "环境变量已设置:" -ForegroundColor Green
Write-Host "  DATABASE_URL: $env:DATABASE_URL"
Write-Host "  FRONTEND_URL: $env:FRONTEND_URL"
Write-Host "  VERIFY_BASE_URL: $env:VERIFY_BASE_URL"
Write-Host ""

# 检查并启动区块链节点
Write-Host "[1/3] 启动区块链节点..." -ForegroundColor Yellow
$blockchainJob = Start-Job -ScriptBlock {
    Set-Location $using:PROJECT_ROOT\blockchain
    npx hardhat node 2>&1
}

Start-Sleep -Seconds 3

# 部署智能合约
Write-Host "[2/3] 部署智能合约..." -ForegroundColor Yellow
Push-Location "$PROJECT_ROOT\blockchain"
npx hardhat run scripts/deploy.ts --network localhost 2>$null
Pop-Location

# 启动后端服务
Write-Host "[3/3] 启动后端服务..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    $env:DATABASE_URL = $using:env:DATABASE_URL
    $env:FRONTEND_URL = $using:env:FRONTEND_URL
    $env:VERIFY_BASE_URL = $using:env:VERIFY_BASE_URL
    $env:JWT_SECRET = $using:env:JWT_SECRET
    $env:BLOCKCHAIN_RPC_URL = $using:env:BLOCKCHAIN_RPC_URL
    Set-Location $using:PROJECT_ROOT\backend
    npx tsx src/index.ts 2>&1
}

Start-Sleep -Seconds 2

# 启动前端服务
Write-Host "[4/3] 启动前端服务..." -ForegroundColor Yellow
Push-Location "$PROJECT_ROOT\frontend"
npm run dev
Pop-Location

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "   系统已启动！" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址:" -ForegroundColor Cyan
Write-Host "  本机访问: http://localhost:5173" -ForegroundColor White
Write-Host "  局域网访问: http://${IP}:5173" -ForegroundColor White
Write-Host ""
Write-Host "测试账号:" -ForegroundColor Cyan
Write-Host "  管理员: admin@example.com / admin123" -ForegroundColor White
Write-Host "  高校: university@pku.edu.cn / university123" -ForegroundColor White
Write-Host "  企业: hr@alibaba.com / company123" -ForegroundColor White
Write-Host "  学生: student@pku.edu.cn / student123" -ForegroundColor White
Write-Host ""

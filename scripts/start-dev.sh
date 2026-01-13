#!/bin/bash

# 开发环境启动脚本
# 同时启动区块链节点、后端和前端

set -e

echo ""
echo "🚀 启动开发环境..."
echo ""

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# 检查是否安装了必要的工具
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装"
    exit 1
fi

# 创建日志目录
mkdir -p "$PROJECT_ROOT/logs"

echo "📦 启动本地区块链节点..."
cd "$PROJECT_ROOT/blockchain"
pnpm node > "$PROJECT_ROOT/logs/blockchain.log" 2>&1 &
BLOCKCHAIN_PID=$!
echo "   区块链节点 PID: $BLOCKCHAIN_PID"

# 等待区块链启动
sleep 3

echo "🔧 部署智能合约..."
pnpm deploy:local >> "$PROJECT_ROOT/logs/blockchain.log" 2>&1

echo "🖥️  启动后端服务..."
cd "$PROJECT_ROOT/backend"
pnpm dev > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "   后端服务 PID: $BACKEND_PID"

# 等待后端启动
sleep 2

echo "🌐 启动前端服务..."
cd "$PROJECT_ROOT/frontend"
pnpm dev > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "   前端服务 PID: $FRONTEND_PID"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   🎉 开发环境已启动！                                       ║"
echo "║                                                            ║"
echo "║   前端地址: http://localhost:5173                          ║"
echo "║   后端地址: http://localhost:3001                          ║"
echo "║   区块链:   http://localhost:8545                          ║"
echo "║                                                            ║"
echo "║   日志文件:                                                 ║"
echo "║   - logs/blockchain.log                                    ║"
echo "║   - logs/backend.log                                       ║"
echo "║   - logs/frontend.log                                      ║"
echo "║                                                            ║"
echo "║   按 Ctrl+C 停止所有服务                                    ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 捕获退出信号
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $BLOCKCHAIN_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "✅ 所有服务已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 等待所有进程
wait

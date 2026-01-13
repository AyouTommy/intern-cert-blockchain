#!/bin/bash

# 高校实习证明上链系统 - 一键部署脚本
# ===========================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   🎓 高校实习证明上链系统 - 一键部署                        ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 未安装，请先安装 $1${NC}"
        exit 1
    fi
}

# 步骤提示
step() {
    echo ""
    echo -e "${BLUE}📦 $1${NC}"
    echo "----------------------------------------"
}

# 成功提示
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 警告提示
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 检查环境
step "检查环境依赖..."
check_command node
check_command npm
check_command git

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 版本需要 >= 18，当前版本: $(node -v)${NC}"
    exit 1
fi
success "Node.js $(node -v)"

# 检查pnpm
if ! command -v pnpm &> /dev/null; then
    warning "pnpm 未安装，正在安装..."
    npm install -g pnpm
fi
success "pnpm $(pnpm -v)"

# 安装依赖
step "安装区块链依赖..."
cd blockchain
pnpm install
success "区块链依赖安装完成"

step "安装后端依赖..."
cd ../backend
pnpm install
success "后端依赖安装完成"

step "安装前端依赖..."
cd ../frontend
pnpm install
success "前端依赖安装完成"

# 编译合约
step "编译智能合约..."
cd ../blockchain
pnpm run compile
success "智能合约编译完成"

# 创建环境配置
step "创建环境配置文件..."
cd ../backend
if [ ! -f .env ]; then
    cat > .env << EOF
# 数据库配置
DATABASE_URL="postgresql://postgres:password@localhost:5432/internship_cert?schema=public"

# JWT配置
JWT_SECRET="your-super-secret-jwt-key-$(openssl rand -hex 16)"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3001
NODE_ENV=development

# 区块链配置
BLOCKCHAIN_RPC_URL="http://127.0.0.1:8545"
CONTRACT_ADDRESS=""
SIGNER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
CHAIN_ID=31337

# 前端URL
FRONTEND_URL="http://localhost:5173"
VERIFY_BASE_URL="http://localhost:5173/verify"
EOF
    success "后端 .env 文件已创建"
else
    warning ".env 文件已存在，跳过创建"
fi

cd ../frontend
if [ ! -f .env ]; then
    cat > .env << EOF
VITE_API_URL=http://localhost:3001/api
EOF
    success "前端 .env 文件已创建"
else
    warning ".env 文件已存在，跳过创建"
fi

cd ..

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   ✅ 安装完成！                                             ║"
echo "║                                                            ║"
echo "║   下一步操作:                                               ║"
echo "║                                                            ║"
echo "║   1. 启动PostgreSQL数据库                                   ║"
echo "║   2. 修改 backend/.env 中的数据库连接                       ║"
echo "║   3. 运行数据库迁移:                                        ║"
echo "║      cd backend && pnpm prisma migrate dev                 ║"
echo "║   4. 初始化种子数据:                                        ║"
echo "║      cd backend && pnpm prisma:seed                        ║"
echo "║   5. 启动本地区块链:                                        ║"
echo "║      cd blockchain && pnpm node                            ║"
echo "║   6. 部署智能合约:                                          ║"
echo "║      cd blockchain && pnpm deploy:local                    ║"
echo "║   7. 启动后端服务:                                          ║"
echo "║      cd backend && pnpm dev                                ║"
echo "║   8. 启动前端服务:                                          ║"
echo "║      cd frontend && pnpm dev                               ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

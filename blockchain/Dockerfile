FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install

# 复制源代码
COPY . .

# 编译合约
RUN pnpm run compile

EXPOSE 8545

CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]

FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install

# 复制源代码
COPY . .

# 生成Prisma客户端
RUN pnpm prisma generate

# 编译TypeScript
RUN pnpm build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

# 复制构建产物和依赖
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# 复制合约ABI（如果存在）
COPY --from=builder /app/src/contracts ./dist/contracts

EXPOSE 3001

CMD ["node", "dist/index.js"]

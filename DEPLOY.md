# 🚀 免费云部署指南

本指南将帮助你将系统免费部署到云端，实现公网访问。

## 📋 部署架构

| 组件 | 平台 | 费用 |
|------|------|------|
| 前端 | Vercel | ✅ 免费 |
| 后端 | Render | ✅ 免费 |
| 数据库 | Render PostgreSQL | ✅ 免费 |
| 区块链 | Sepolia 测试网 | ✅ 免费 |

---

## 第一步：准备工作

### 1.1 注册账号（都是免费的）

1. **GitHub**: https://github.com （用于代码托管）
2. **Vercel**: https://vercel.com （用GitHub登录）
3. **Render**: https://render.com （用GitHub登录）
4. **Alchemy**: https://alchemy.com （区块链RPC服务）

### 1.2 上传代码到GitHub

```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/intern-cert-system.git
git push -u origin main
```

---

## 第二步：部署后端到 Render

### 2.1 创建数据库

1. 登录 [Render Dashboard](https://dashboard.render.com)
2. 点击 **New +** → **PostgreSQL**
3. 填写信息：
   - Name: `intern-cert-db`
   - Region: `Singapore` (或最近的区域)
   - Plan: **Free**
4. 点击 **Create Database**
5. 等待创建完成，复制 **Internal Database URL**

### 2.2 部署后端服务

1. 在 Render Dashboard 点击 **New +** → **Web Service**
2. 连接你的 GitHub 仓库
3. 填写配置：
   - Name: `intern-cert-api`
   - Root Directory: `backend`
   - Environment: `Node`
   - Region: `Singapore`
   - Branch: `main`
   - Build Command: `npm install && npx prisma generate && npx prisma db push`
   - Start Command: `npm run build && npm start`
   - Plan: **Free**

4. 添加环境变量（点击 **Advanced** → **Add Environment Variable**）：

| Key | Value |
|-----|-------|
| `DATABASE_URL` | (粘贴第2.1步的Internal Database URL) |
| `JWT_SECRET` | (随机生成一个长字符串，如: `your-super-secret-jwt-key-2024`) |
| `FRONTEND_URL` | (先留空，部署前端后再填) |
| `BLOCKCHAIN_RPC_URL` | (第三步获取) |
| `SIGNER_PRIVATE_KEY` | (第三步获取) |
| `NODE_ENV` | `production` |

5. 点击 **Create Web Service**
6. 等待部署完成，记录后端URL：`https://intern-cert-api-xxxx.onrender.com`

---

## 第三步：配置区块链（Sepolia测试网）

### 3.1 获取 Alchemy API

1. 登录 [Alchemy Dashboard](https://dashboard.alchemy.com)
2. 点击 **Create new app**
3. 选择：
   - Chain: `Ethereum`
   - Network: `Sepolia`
4. 创建后，点击 **View Key**
5. 复制 **HTTPS** URL，格式如：
   ```
   https://eth-sepolia.g.alchemy.com/v2/你的API密钥
   ```

### 3.2 创建测试钱包

1. 安装 MetaMask 浏览器插件
2. 创建新钱包或使用现有钱包
3. 切换到 **Sepolia 测试网**
4. 导出私钥（设置 → 账户详情 → 显示私钥）
5. **⚠️ 安全提示**：仅用于测试，不要在这个钱包存放真实资产！

### 3.3 获取测试ETH

访问水龙头获取免费测试ETH：
- https://sepoliafaucet.com
- https://www.alchemy.com/faucets/ethereum-sepolia

### 3.4 部署智能合约到Sepolia

```bash
cd blockchain

# 创建 .env 文件
echo "SEPOLIA_RPC_URL=你的Alchemy_URL" > .env
echo "PRIVATE_KEY=你的钱包私钥" >> .env

# 修改 hardhat.config.ts 添加 Sepolia 网络配置
```

修改 `blockchain/hardhat.config.ts`：

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
```

部署合约：

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

记录部署的合约地址！

### 3.5 更新 Render 环境变量

回到 Render Dashboard，更新后端服务的环境变量：

| Key | Value |
|-----|-------|
| `BLOCKCHAIN_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/你的API密钥` |
| `SIGNER_PRIVATE_KEY` | `你的钱包私钥` |

同时需要更新合约配置文件 `backend/src/contracts/InternshipCertification.json` 中的合约地址。

---

## 第四步：部署前端到 Vercel

### 4.1 导入项目

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New** → **Project**
3. 选择你的 GitHub 仓库
4. 配置：
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 4.2 添加环境变量

点击 **Environment Variables**：

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://intern-cert-api-xxxx.onrender.com/api` |

### 4.3 部署

点击 **Deploy**，等待部署完成。

记录前端URL：`https://你的项目名.vercel.app`

---

## 第五步：完成配置

### 5.1 更新后端的前端URL

回到 Render Dashboard，更新后端环境变量：

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | `https://你的项目名.vercel.app` |

### 5.2 初始化数据库

后端部署后，需要添加初始数据。可以通过以下方式：

1. 在 Render 的 Shell 中运行：
```bash
npx prisma db seed
```

或者手动注册管理员账号。

---

## ✅ 部署完成！

现在你可以通过以下地址访问系统：

- **前端**: `https://你的项目名.vercel.app`
- **后端API**: `https://intern-cert-api-xxxx.onrender.com`

### 默认账户（如果运行了seed）

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@example.com | admin123 |
| 高校 | university@pku.edu.cn | university123 |

---

## ⚠️ 注意事项

1. **免费层限制**：
   - Render 免费服务会在15分钟无活动后休眠，首次访问需要等待约30秒唤醒
   - PostgreSQL 免费数据库会在90天后过期（需要手动续期）

2. **区块链**：
   - Sepolia 是测试网，不要用于生产环境
   - 生产环境需要使用主网，会产生真实的 Gas 费用

3. **安全**：
   - 私钥仅用于测试，不要在测试钱包存放真实资产
   - 生产环境需要更严格的安全措施

---

## 🔧 常见问题

### Q: 后端返回500错误？
A: 检查 Render 日志，确认数据库连接正常，环境变量配置正确。

### Q: 前端无法连接后端？
A: 确认 `VITE_API_URL` 配置正确，检查是否有 CORS 问题。

### Q: 智能合约调用失败？
A: 确认钱包有足够的测试ETH，合约地址配置正确。

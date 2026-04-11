# 🔗 链证通 — 基于区块链的高校实习证明上链系统

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Ethereum-Sepolia-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white" alt="Ethereum">
</p>

<p align="center">
  <a href="https://intern-cert-blockchain.vercel.app">🌐 在线演示</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://intern-cert-api.onrender.com/health">📡 API 状态</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#-快速开始">🚀 快速开始</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#-部署指南">☁️ 部署指南</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#-api-文档">📡 API 文档</a>
</p>

---

## 📖 项目简介

基于区块链技术的高校实习证明管理与核验系统，实现证明的**不可篡改存储**与**链上核验**。系统支持多角色协作，覆盖实习申请、企业评价、高校审核、证书上链、公开核验的完整业务流程。

### 🎯 核心价值

| 特性 | 描述 |
|------|------|
| 🛡️ **防伪可信** | 证书哈希上链存储，基于 Ethereum 智能合约，确保不可篡改 |
| 🔍 **便捷核验** | 扫码即可核验证书真伪，支持公开无登录核验 |
| 👥 **多方协作** | 学生、企业、高校、管理员四方协同工作 |
| 📋 **流程透明** | 完整的审批流程链条与审计日志追踪 |
| 📄 **PDF 导出** | 支持证书 PDF 生成与下载，含二维码核验 |
| 🔔 **通知驱动** | 每个环节自动通知下一角色，流程无缝流转 |

## 🏗️ 系统架构

```
┌───────────────────────────────────────────────────────────────────────┐
│                          🖥️  前端应用层                               │
│          React 18 + TypeScript + Tailwind CSS + Zustand              │
│                    部署于 Vercel（全球 CDN）                           │
│             配置文件: frontend/vercel.json                            │
├───────────────────────────────────────────────────────────────────────┤
│                          ⚙️  后端服务层                               │
│         Node.js + Express + Prisma ORM + JWT + Ethers.js             │
│                     部署于 Render（免费托管）                          │
│             配置文件: backend/render.yaml                             │
├────────────────────────────┬──────────────────────────────────────────┤
│      📦 数据存储层          │            ⛓️  区块链层                  │
│   PostgreSQL (Neon Cloud)  │    Ethereum Sepolia + Solidity 0.8.20   │
│    配置: backend/.env      │     配置: blockchain/hardhat.config.ts   │
│    ORM: prisma/schema.prisma │   合约: InternshipCertification.sol   │
└────────────────────────────┴──────────────────────────────────────────┘
```

## ✨ 功能特性

### 👨‍🎓 学生端
- 实习申请创建、提交与进度跟踪
- 申请撤回（企业评价前可撤回）
- 证书查看与下载（PDF 导出，含二维码）
- 证书分享与核验码生成
- 个人信息与密码管理

### 🏢 企业端
- 实习申请评价与数字签章
- 企业评分与评语填写
- 申请拒绝（附理由）
- 企业信息管理

### 🎓 高校端
- 学生白名单管理（支持 Excel 批量导入）
- 实习申请审核与审批
- 证书签发与区块链自动/手动上链
- 证书撤销（同步链上撤销）

### 🛡️ 系统管理员
- 用户注册审批（高校/企业账号审核）
- 密码重置请求审核
- 机构管理（高校、企业 CRUD）
- 机构管理员账户分配
- 系统数据统计与可视化看板

### 🔍 公开核验（无需登录）
- 扫码核验证书真伪（二维码 → 公共核验页面）
- 验证码 / 证书编号 / 区块链哈希 三种核验方式
- 区块链存证信息溯源展示
- 学生信息自动脱敏保护隐私

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React 18, TypeScript, Vite 5, Tailwind CSS, Zustand, React Router 6, Framer Motion, Recharts, Axios | SPA 单页应用 |
| **后端** | Node.js 18+, Express 4, Prisma 5 ORM, JWT, bcryptjs, Ethers.js 6, PDFKit, QRCode, xlsx, multer | RESTful API |
| **数据库** | PostgreSQL 16（Neon Cloud 托管） | 15 张数据表 |
| **区块链** | Ethereum Sepolia 测试网, Solidity 0.8.20, Hardhat, OpenZeppelin | RBAC 权限控制 |
| **部署** | Vercel（前端 CDN）, Render（后端 Node.js）, Neon（PostgreSQL） | 全部免费托管 |

## 📁 项目结构

```
intern-cert-blockchain/
├── frontend/                          # 前端项目（React + Vite + TypeScript）
│   ├── src/
│   │   ├── components/                # 可复用 UI 组件（5个）
│   │   │   ├── CertificatePreview.tsx     # 证书预览组件
│   │   │   ├── PublicCertificatePreview.tsx # 公共核验证书预览
│   │   │   ├── NotificationBell.tsx       # 通知铃铛（轮询 + 跳转）
│   │   │   ├── ConfirmDeleteModal.tsx     # 确认删除弹窗
│   │   │   └── OrgAdminModal.tsx          # 机构管理员管理弹窗
│   │   ├── layouts/                   # 页面布局（2个）
│   │   │   ├── MainLayout.tsx             # 主布局（侧栏 + 角色导航）
│   │   │   └── AuthLayout.tsx             # 认证页布局
│   │   ├── pages/                     # 页面组件（19个）
│   │   │   ├── DashboardPage.tsx          # 数据统计看板
│   │   │   ├── ApplicationsPage.tsx       # 实习申请管理（全角色）
│   │   │   ├── CertificatesPage.tsx       # 证书列表
│   │   │   ├── CertificateDetailPage.tsx  # 证书详情（上链/撤销/PDF）
│   │   │   ├── CreateCertificatePage.tsx   # 手动创建证书
│   │   │   ├── VerifyPage.tsx             # 登录后核验页面
│   │   │   ├── PublicVerifyPage.tsx        # 公开核验页面（无需登录）
│   │   │   ├── WhitelistPage.tsx          # 学生白名单（Excel 导入）
│   │   │   ├── UsersPage.tsx              # 用户管理 + 注册审批
│   │   │   ├── UniversitiesPage.tsx       # 高校管理
│   │   │   ├── CompaniesPage.tsx          # 企业管理
│   │   │   ├── ThirdPartyOrgsPage.tsx     # 第三方机构管理
│   │   │   ├── SettingsPage.tsx           # 系统设置
│   │   │   ├── LoginPage.tsx              # 登录
│   │   │   ├── RegisterPage.tsx           # 注册（含角色选择）
│   │   │   ├── ForgotPasswordPage.tsx     # 忘记密码
│   │   │   ├── PrivacyPage.tsx            # 隐私政策
│   │   │   ├── TermsPage.tsx              # 服务条款
│   │   │   └── NotFoundPage.tsx           # 404 页面
│   │   ├── services/
│   │   │   └── api.ts                     # Axios 封装（拦截器 + Token）
│   │   ├── stores/
│   │   │   └── authStore.ts               # Zustand 认证状态（sessionStorage）
│   │   ├── App.tsx                        # 路由配置 + 权限守卫
│   │   ├── main.tsx                       # 应用入口
│   │   └── index.css                      # 全局样式 + 设计系统
│   ├── vercel.json                    # ✅ Vercel 部署配置
│   ├── vite.config.ts                 # Vite 构建配置
│   ├── tailwind.config.js             # Tailwind CSS 配置
│   └── package.json
│
├── backend/                           # 后端项目（Express + Prisma + TypeScript）
│   ├── src/
│   │   ├── routes/                    # API 路由模块（14个）
│   │   │   ├── auth.ts                    # 认证（登录/注册/审批）
│   │   │   ├── applications.ts            # 实习申请全流程 + 自动上链
│   │   │   ├── certificates.ts            # 证书 CRUD + 手动上链/撤销
│   │   │   ├── verify.ts                  # 公开核验（3种方式）
│   │   │   ├── users.ts                   # 用户管理 + 密码重置审核
│   │   │   ├── whitelist.ts               # 学生白名单（Excel 导入）
│   │   │   ├── universities.ts            # 高校 CRUD
│   │   │   ├── companies.ts               # 企业 CRUD
│   │   │   ├── thirdPartyOrgs.ts          # 第三方机构 CRUD
│   │   │   ├── orgAdmins.ts               # 机构管理员分配
│   │   │   ├── templates.ts               # 证书模板管理
│   │   │   ├── attachments.ts             # 附件上传（multer）
│   │   │   ├── notifications.ts           # 通知 CRUD + 已读标记
│   │   │   └── stats.ts                   # 仪表盘统计数据
│   │   ├── services/                  # 业务服务层
│   │   │   ├── blockchain.ts              # 区块链交互（ethers.js）
│   │   │   └── certificatePdf.ts          # PDF 证书生成（PDFKit）
│   │   ├── middleware/                # Express 中间件
│   │   │   ├── auth.ts                    # JWT 认证 + 角色授权
│   │   │   ├── errorHandler.ts            # 全局错误处理
│   │   │   └── requestLogger.ts           # 请求日志
│   │   ├── config/
│   │   │   └── index.ts                   # 系统配置（数据库/JWT/区块链）
│   │   ├── contracts/
│   │   │   └── InternshipCertification.json  # 编译后的合约 ABI
│   │   └── index.ts                       # Express 应用入口
│   ├── prisma/
│   │   ├── schema.prisma              # 数据库模型定义（15张表）
│   │   └── seed.ts                    # 数据库种子脚本
│   ├── render.yaml                    # ✅ Render 部署配置
│   ├── Dockerfile                     # Docker 构建文件
│   └── package.json
│
├── blockchain/                        # 智能合约项目（Hardhat）
│   ├── contracts/
│   │   └── InternshipCertification.sol    # 主合约（Solidity 0.8.20）
│   ├── scripts/
│   │   └── deploy.ts                      # 合约部署脚本
│   ├── test/                          # 合约测试
│   ├── hardhat.config.ts              # ✅ Hardhat 配置（Sepolia 网络）
│   └── package.json
│
├── scripts/                           # 工具脚本
│   └── batch-upchain.ts               # 批量上链脚本
├── docker-compose.yml                 # ✅ Docker 一键启动（本地开发）
├── package.json                       # 根项目配置
└── README.md
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 15.x（本地开发）或使用 Docker

### 方式一：Docker 一键启动

```bash
git clone https://github.com/AyouTommy/intern-cert-blockchain.git
cd intern-cert-blockchain
docker compose up -d
```

> **配置文件**：`docker-compose.yml`（根目录）
> 会启动 4 个服务：PostgreSQL、Hardhat 本地链、后端 API、前端应用

启动后访问：
- 前端：http://localhost:5173
- 后端 API：http://localhost:3001
- 区块链节点：http://localhost:8545

### 方式二：手动安装

1. **克隆项目**
```bash
git clone https://github.com/AyouTommy/intern-cert-blockchain.git
cd intern-cert-blockchain
```

2. **安装依赖**
```bash
# 后端
cd backend && npm install

# 前端
cd ../frontend && npm install
```

3. **配置环境变量**

后端 `backend/.env`（参考 `backend/env.example.txt`）：
```env
# 数据库连接（Neon Cloud 连接串）
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/intern_cert?sslmode=require"

# JWT 配置
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"

# 前端地址（用于生成核验链接和二维码）
FRONTEND_URL="http://localhost:5173"

# 区块链配置（Sepolia 测试网）
BLOCKCHAIN_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/your-api-key"
SIGNER_PRIVATE_KEY="your-wallet-private-key"
```

前端 `frontend/.env`（参考 `frontend/env.example.txt`）：
```env
VITE_API_URL="http://localhost:3001/api"
```

4. **初始化数据库**
```bash
cd backend
npx prisma generate    # 生成 Prisma Client
npx prisma db push     # 同步数据库表结构
npx tsx prisma/seed.ts # （可选）导入种子数据
```

> **模型定义**：`backend/prisma/schema.prisma`（15 张数据表）

5. **部署智能合约**（可选，使用 Sepolia 测试网）
```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

> **部署脚本**：`blockchain/scripts/deploy.ts`
> **合约源码**：`blockchain/contracts/InternshipCertification.sol`
> 部署后会生成 ABI 文件到 `backend/src/contracts/InternshipCertification.json`

6. **启动开发服务器**
```bash
# 后端（终端 1）
cd backend && npm run dev

# 前端（终端 2）
cd frontend && npm run dev
```

7. **访问系统**
- 前端：http://localhost:5173
- 后端 API：http://localhost:3001
- 健康检查：http://localhost:3001/health

## ☁️ 部署指南

### 1. 数据库 — Neon Cloud（PostgreSQL）

| 项目 | 说明 |
|------|------|
| **服务** | [Neon](https://neon.tech) — 永久免费 PostgreSQL 托管 |
| **代码位置** | `backend/prisma/schema.prisma` — 数据表模型定义 |
| **配置位置** | `backend/.env` → `DATABASE_URL` 环境变量 |
| **初始化命令** | `npx prisma db push` — 自动同步表结构到远程数据库 |

**步骤**：
1. 注册 [neon.tech](https://neon.tech)，创建项目，选择地区
2. 复制连接字符串，填入 `backend/.env` 的 `DATABASE_URL`
3. 运行 `npx prisma db push` 初始化远程数据库

---

### 2. 后端 — Render（Node.js）

| 项目 | 说明 |
|------|------|
| **服务** | [Render](https://render.com) — 免费 Node.js 托管 |
| **配置文件** | `backend/render.yaml` — 定义构建命令、启动命令、环境变量 |
| **构建命令** | `npm install && npx prisma generate && npx prisma db push` |
| **启动命令** | `npm start`（执行 `node dist/index.js`） |
| **入口文件** | `backend/src/index.ts` → 编译后 `backend/dist/index.js` |
| **健康检查** | `/health` 端点 |

**步骤**：
1. 将代码推送到 GitHub
2. 在 Render 创建 Web Service，关联 GitHub 仓库
3. Root Directory 设为 `backend`
4. Build Command：`npm install && npx prisma generate && npx prisma db push`
5. Start Command：`npm start`
6. 在 Environment 中配置以下环境变量：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Neon 数据库连接串 |
| `JWT_SECRET` | JWT 密钥（随机字符串） |
| `FRONTEND_URL` | 前端 Vercel 地址（如 `https://intern-cert-blockchain.vercel.app`） |
| `BLOCKCHAIN_RPC_URL` | Alchemy / Infura 的 Sepolia RPC 地址 |
| `SIGNER_PRIVATE_KEY` | 部署合约的钱包私钥 |
| `NODE_ENV` | `production` |

> **注意**：`FRONTEND_URL` 必须正确设置，后端用它生成证书核验链接和二维码。
> 对应代码：`backend/src/config/index.ts` 第 23 行 `getVerifyBaseUrl()` 函数。

---

### 3. 前端 — Vercel（静态部署 + CDN）

| 项目 | 说明 |
|------|------|
| **服务** | [Vercel](https://vercel.com) — 免费前端托管（全球 CDN） |
| **配置文件** | `frontend/vercel.json` — SPA 路由重写规则 |
| **构建命令** | `npm run build`（执行 `tsc && vite build`） |
| **输出目录** | `dist` |
| **框架** | Vite |

**`frontend/vercel.json` 的作用**：
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
这条规则让所有 URL 都返回 `index.html`，由前端 React Router 处理路由。没有这个配置，直接访问 `/verify/xxx` 等子路径会 404。

**步骤**：
1. 在 Vercel 导入 GitHub 仓库
2. Root Directory 设为 `frontend`
3. Framework Preset 选择 `Vite`
4. 在 Environment Variables 中设置：

| 变量 | 说明 |
|------|------|
| `VITE_API_URL` | 后端 Render 地址（如 `https://intern-cert-api.onrender.com/api`） |

> **对应代码**：`frontend/src/services/api.ts` 中通过 `import.meta.env.VITE_API_URL` 读取后端地址。

---

### 4. 智能合约 — Ethereum Sepolia

| 项目 | 说明 |
|------|------|
| **网络** | Ethereum Sepolia 测试网（chainId: 11155111）|
| **合约源码** | `blockchain/contracts/InternshipCertification.sol` |
| **部署脚本** | `blockchain/scripts/deploy.ts` |
| **网络配置** | `blockchain/hardhat.config.ts` 第 25 行 `sepolia` 网络 |
| **编译产物** | 部署后自动复制到 `backend/src/contracts/InternshipCertification.json` |

**步骤**：
1. 配置 `blockchain/.env`：
```env
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/your-api-key"
PRIVATE_KEY="your-wallet-private-key"
```
2. 确保钱包有 Sepolia 测试 ETH（可从 [faucet](https://sepoliafaucet.com) 领取）
3. 部署合约：
```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network sepolia
```
4. 部署脚本会自动将合约地址和 ABI 写入 `backend/src/contracts/InternshipCertification.json`
5. 后端启动时在 `backend/src/services/blockchain.ts` 第 32 行自动加载这个合约文件

---

### 部署配置速查表

| 服务 | 配置文件位置 | 关键代码位置 |
|------|-------------|-------------|
| **Vercel（前端）** | `frontend/vercel.json` | `frontend/src/services/api.ts` — API 地址 |
| **Render（后端）** | `backend/render.yaml` | `backend/src/index.ts` — Express 入口 |
| **Neon（数据库）** | `backend/.env` → `DATABASE_URL` | `backend/prisma/schema.prisma` — 表结构 |
| **Sepolia（区块链）** | `blockchain/hardhat.config.ts` | `backend/src/services/blockchain.ts` — 合约交互 |
| **Docker（本地开发）** | `docker-compose.yml`（根目录） | 启动 4 个容器一键运行 |

## 📡 API 文档

### 认证模块

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册（需管理员审批） | ❌ |
| POST | `/api/auth/login` | 用户登录，返回 JWT Token | ❌ |
| GET | `/api/auth/me` | 获取当前登录用户信息 | ✅ |

### 用户管理

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/users` | 获取用户列表（分页） | ✅ 管理员 |
| PATCH | `/api/users/:id/approve` | 审批用户注册 | ✅ 管理员 |
| GET | `/api/users/password-reset-requests` | 密码重置请求列表 | ✅ 管理员 |

### 实习申请

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/applications` | 获取申请列表（按角色过滤） | ✅ |
| POST | `/api/applications` | 创建实习申请 | ✅ 学生 |
| POST | `/api/applications/:id/submit` | 提交申请（草稿→已提交） | ✅ 学生 |
| POST | `/api/applications/:id/company-review` | 企业评价签章 | ✅ 企业 |
| POST | `/api/applications/:id/university-review` | 高校审核（自动生成证书+上链） | ✅ 高校/管理员 |
| POST | `/api/applications/:id/withdraw` | 撤回申请 | ✅ 学生 |
| DELETE | `/api/applications/:id` | 删除申请（含关联证书） | ✅ 管理员 |

### 证书管理

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/certificates` | 获取证书列表 | ✅ |
| POST | `/api/certificates` | 创建并上链证书 | ✅ 高校 |
| POST | `/api/certificates/:id/upchain` | 手动上链 | ✅ 高校/管理员 |
| POST | `/api/certificates/:id/revoke` | 撤销证书 | ✅ 高校/管理员 |
| GET | `/api/certificates/:id/pdf` | 导出证书 PDF | 公开 |

### 公开核验

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/verify/code/:code` | 通过验证码核验 | ❌ |
| GET | `/api/verify/number/:certNumber` | 通过证书编号核验 | ❌ |
| GET | `/api/verify/hash/:hash` | 通过区块链哈希核验 | ❌ |
| GET | `/api/verify/contract-info` | 获取合约信息 | ❌ |

### 其他模块

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/universities` | 获取高校列表 | ❌ |
| GET | `/api/companies` | 获取企业列表 | ❌ |
| GET | `/api/stats/dashboard` | 仪表盘统计数据 | ✅ |
| GET | `/api/templates` | 证书模板管理 | ✅ 高校 |
| POST | `/api/whitelist/import` | Excel 批量导入白名单 | ✅ 高校 |
| GET | `/api/notifications` | 通知列表 | ✅ |
| PATCH | `/api/notifications/:id/read` | 标记通知已读 | ✅ |
| PATCH | `/api/notifications/read-all` | 全部标记已读 | ✅ |
| POST | `/api/attachments` | 上传实习附件 | ✅ |
| GET | `/api/org-admins` | 机构管理员管理 | ✅ 管理员 |

## 🔐 智能合约

合约部署在 **Ethereum Sepolia 测试网**，基于 OpenZeppelin 实现 RBAC 权限控制。

### 核心功能

| 函数 | 描述 | 权限 |
|------|------|------|
| `createCertificate()` | 注册证书哈希上链 | ADMIN / UNIVERSITY / COMPANY |
| `verifyCertificate()` | 验证证书是否存在及有效 | 公开可调用 |
| `revokeCertificate()` | 撤销证书 | 签发者 / ADMIN |
| `batchCreateCertificates()` | 批量证书上链（≤50条） | ADMIN / UNIVERSITY |
| `getStudentCertificates()` | 查询学生所有证书 | 公开可调用 |
| `getStatistics()` | 获取链上统计数据 | 公开可调用 |

### 合约安全特性

- ✅ **AccessControl** — 基于角色的权限管理（Admin / University / Company）
- ✅ **Pausable** — 紧急暂停机制
- ✅ **ReentrancyGuard** — 重入攻击防护
- ✅ **事件日志** — 完整的链上事件追踪

## 📊 数据库模型

系统包含 **15 张数据表**，使用 Prisma ORM 管理。模型定义文件：`backend/prisma/schema.prisma`

| 表名 | 描述 | 主要字段 |
|------|------|----------|
| User | 用户表 | email, role, walletAddress, approvalStatus |
| StudentProfile | 学生档案 | studentId, major, department |
| University | 高校表 | code, name, walletAddress, isVerified |
| Company | 企业表 | code, name, industry, scale |
| ThirdPartyOrg | 第三方机构 | code, type, businessLicense |
| Certificate | 实习证明 | certNumber, certHash, txHash, status, verifyCode |
| CertificateTemplate | 证书模板 | name, content, fields |
| InternshipApplication | 实习申请 | applicationNo, status, companyScore, companyEvaluation |
| Attachment | 证明附件 | fileName, fileHash, category |
| Verification | 核验记录 | verifierIp, isValid |
| StudentWhitelist | 学生白名单 | studentId, name, isUsed |
| AuditLog | 审计日志 | action, entityType, oldValue, newValue |
| Notification | 通知 | title, content, type, isRead, link |
| SystemConfig | 系统配置 | key, value |
| PasswordResetRequest | 密码重置请求 | status, newPasswordHash |

## 🌐 在线演示

| 服务 | 地址 | 说明 |
|------|------|------|
| 🖥️ 前端 | https://intern-cert-blockchain.vercel.app | Vercel 全球 CDN |
| 📡 后端 API | https://intern-cert-api.onrender.com | Render 免费托管 |
| 🗄️ 数据库 | Neon Cloud (PostgreSQL) | 永久免费托管 |
| ⛓️ 智能合约 | Ethereum Sepolia 测试网 | — |

> **Note**: Render 免费服务首次访问可能需要 30-60 秒冷启动，之后响应正常。

### 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 系统管理员 | admin@example.com | 请联系作者获取 |

## 📄 许可证

MIT License

## 👥 作者

- **开发者**: Tommy
- **邮箱**: ayouxiaomi@gmail.com
- **GitHub**: [AyouTommy](https://github.com/AyouTommy)

---

<p align="center">
  <sub>Built with ❤️ for Higher Education &nbsp;|&nbsp; 让实习证明更可信</sub>
</p>

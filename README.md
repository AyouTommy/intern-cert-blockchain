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
| 👥 **多方协作** | 学生、企业、高校、第三方机构（HR/背调）四方协同工作 |
| 📋 **流程透明** | 完整的审批流程链条与审计日志追踪 |
| 📄 **PDF 导出** | 支持证书 PDF 生成与下载，含二维码核验 |

## 🏗️ 系统架构

```
┌───────────────────────────────────────────────────────────────────────┐
│                          🖥️  前端应用层                               │
│          React 18 + TypeScript + Tailwind CSS + Zustand              │
│                    部署于 Vercel（全球 CDN）                           │
├───────────────────────────────────────────────────────────────────────┤
│                          ⚙️  后端服务层                               │
│         Node.js + Express + Prisma ORM + JWT + Ethers.js             │
│                     部署于 Render（免费托管）                          │
├────────────────────────────┬──────────────────────────────────────────┤
│      📦 数据存储层          │            ⛓️  区块链层                  │
│   PostgreSQL (Neon Cloud)  │    Ethereum Sepolia + Solidity 0.8.20   │
│       永久免费托管          │      OpenZeppelin 权限控制 + RBAC       │
└────────────────────────────┴──────────────────────────────────────────┘
```

## ✨ 功能特性

### 👨‍🎓 学生端
- 实习申请提交与进度跟踪
- 证书查看与下载（PDF 导出，含二维码）
- 证书分享与核验码生成
- 个人信息与密码管理

### 🏢 企业端
- 实习申请评价与数字签章
- 企业评分与评语填写
- 企业信息管理
- 实习记录查询

### 🎓 高校端
- 学生白名单管理（支持 Excel 批量导入）
- 实习申请审核与审批
- 证书签发与区块链上链
- 证书模板自定义管理

### 🛡️ 系统管理员
- 用户注册审批（高校/企业账号审核）
- 密码重置请求审核
- 机构管理（高校、企业、第三方机构 CRUD）
- 机构管理员账户分配
- 系统数据统计与可视化看板

### 🔍 公开核验（无需登录）
- 扫码核验证书真伪
- 证书编号 / 核验码查询
- 区块链存证信息溯源展示

### 🤝 第三方机构（HR / 背景调查）
- 独立注册与审核流程
- 证书查验权限
- 机构信息管理

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端** | React, TypeScript, Tailwind CSS, Zustand, React Router, Framer Motion, Recharts | 18.2, 5.3, 3.4 |
| **后端** | Node.js, Express, Prisma ORM, JWT, bcryptjs, PDFKit, QRCode | 18+, 4.18, 5.7 |
| **数据库** | PostgreSQL（Neon Cloud 永久免费托管） | 16 |
| **区块链** | Ethereum Sepolia, Solidity, Hardhat, Ethers.js, OpenZeppelin | 0.8.20, 6.9 |
| **部署** | Vercel（前端）, Render（后端）, Neon（数据库） | — |

## 📁 项目结构

```
intern-cert-blockchain/
├── frontend/                      # 前端项目（React + Vite）
│   ├── src/
│   │   ├── components/            # 可复用 UI 组件
│   │   ├── pages/                 # 19 个页面组件
│   │   │   ├── DashboardPage      # 数据统计看板
│   │   │   ├── LoginPage          # 登录页
│   │   │   ├── RegisterPage       # 注册页（含角色选择）
│   │   │   ├── CertificatesPage   # 证书管理
│   │   │   ├── ApplicationsPage   # 实习申请管理
│   │   │   ├── VerifyPage         # 证书核验
│   │   │   ├── PublicVerifyPage   # 公开核验（无需登录）
│   │   │   ├── UsersPage          # 用户管理
│   │   │   ├── WhitelistPage      # 学生白名单
│   │   │   └── ...                # 更多页面
│   │   ├── stores/                # Zustand 状态管理
│   │   ├── services/              # Axios API 服务封装
│   │   └── hooks/                 # 自定义 React Hooks
│   └── package.json
│
├── backend/                       # 后端项目（Express + Prisma）
│   ├── src/
│   │   ├── routes/                # 14 个 API 路由模块
│   │   │   ├── auth.ts            # 认证（登录/注册/审批）
│   │   │   ├── certificates.ts    # 证书 CRUD + 上链
│   │   │   ├── applications.ts    # 实习申请全流程
│   │   │   ├── verify.ts          # 公开核验
│   │   │   ├── users.ts           # 用户管理 + 密码重置审核
│   │   │   ├── whitelist.ts       # 学生白名单（Excel 导入）
│   │   │   └── ...                # 更多路由
│   │   ├── middleware/            # JWT 认证 + 错误处理 + 日志
│   │   └── index.ts               # Express 入口
│   ├── prisma/
│   │   └── schema.prisma          # 15 张数据表定义
│   └── package.json
│
├── blockchain/                    # 智能合约项目（Hardhat）
│   ├── contracts/
│   │   └── InternshipCertification.sol  # 主合约（446行）
│   ├── scripts/                   # 部署脚本
│   └── hardhat.config.ts
│
├── scripts/                       # 工具脚本
├── docker-compose.yml             # Docker 本地开发环境
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

后端 `backend/.env`：
```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/intern_cert"

# JWT 密钥（生产环境请使用复杂随机字符串）
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"

# 前端地址
FRONTEND_URL="http://localhost:5173"

# 区块链配置（Sepolia 测试网）
BLOCKCHAIN_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/your-api-key"
SIGNER_PRIVATE_KEY="your-wallet-private-key"
```

前端 `frontend/.env`：
```env
VITE_API_URL="http://localhost:3001/api"
```

4. **初始化数据库**
```bash
cd backend
npx prisma generate
npx prisma db push
```

5. **启动开发服务器**
```bash
# 后端（终端 1）
cd backend && npm run dev

# 前端（终端 2）
cd frontend && npm run dev
```

6. **访问系统**
- 前端：http://localhost:5173
- 后端 API：http://localhost:3001
- 健康检查：http://localhost:3001/health

## 📡 API 文档

### 认证模块

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册（需管理员审批） | ❌ |
| POST | `/api/auth/login` | 用户登录 | ❌ |

### 用户管理

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/users` | 获取用户列表 | ✅ 管理员 |
| PATCH | `/api/users/:id/approve` | 审批用户注册 | ✅ 管理员 |
| GET | `/api/users/password-reset-requests` | 密码重置请求列表 | ✅ 管理员 |

### 实习申请

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/applications` | 获取申请列表 | ✅ |
| POST | `/api/applications` | 提交实习申请 | ✅ 学生 |
| PATCH | `/api/applications/:id/company-sign` | 企业签章 | ✅ 企业 |
| PATCH | `/api/applications/:id/university-approve` | 高校审核 | ✅ 高校 |

### 证书管理

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/certificates` | 获取证书列表 | ✅ |
| POST | `/api/certificates` | 创建并上链证书 | ✅ 高校 |
| GET | `/api/certificates/:id/pdf` | 导出证书 PDF | ✅ |

### 公开核验

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/verify/:code` | 核验证书真伪 | ❌ |

### 机构管理

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/universities` | 获取高校列表 | ❌ |
| GET | `/api/companies` | 获取企业列表 | ❌ |
| GET | `/api/third-party-orgs` | 获取第三方机构列表 | ✅ |
| GET | `/api/stats` | 系统统计数据 | ✅ |

### 其他模块

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/templates` | 证书模板管理 | ✅ 高校 |
| POST | `/api/whitelist/import` | Excel 批量导入白名单 | ✅ 高校 |
| GET | `/api/notifications` | 通知列表 | ✅ |
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

### 合约特性

- ✅ **AccessControl** — 基于角色的权限管理（Admin / University / Company）
- ✅ **Pausable** — 紧急暂停机制
- ✅ **ReentrancyGuard** — 重入攻击防护
- ✅ **事件日志** — 完整的链上事件追踪

## 📊 数据库模型

系统包含 **15 张数据表**，使用 Prisma ORM 管理：

| 表名 | 描述 | 主要字段 |
|------|------|----------|
| User | 用户表 | email, role, walletAddress, approvalStatus |
| StudentProfile | 学生档案 | studentId, major, department |
| University | 高校表 | code, name, walletAddress, isVerified |
| Company | 企业表 | code, name, industry, scale |
| ThirdPartyOrg | 第三方机构 | code, type, businessLicense |
| Certificate | 实习证明 | certNumber, certHash, txHash, status |
| CertificateTemplate | 证书模板 | name, content, fields |
| InternshipApplication | 实习申请 | applicationNo, status, companyScore |
| Attachment | 证明附件 | fileName, fileHash, category |
| Verification | 核验记录 | verifierIp, isValid |
| StudentWhitelist | 学生白名单 | studentId, name, isUsed |
| AuditLog | 审计日志 | action, entityType, oldValue, newValue |
| Notification | 通知 | title, content, type, isRead |
| SystemConfig | 系统配置 | key, value |
| PasswordResetRequest | 密码重置请求 | status, newPasswordHash |

## 🌐 在线演示

| 服务 | 地址 | 说明 |
|------|------|------|
| 🖥️ 前端 | https://intern-cert-blockchain.vercel.app | Vercel 全球 CDN |
| 📡 后端 API | https://intern-cert-api.onrender.com | Render 免费托管 |
| 🗄️ 数据库 | Neon Cloud (PostgreSQL) | 永久免费托管 |
| ⛓️ 智能合约 | Ethereum Sepolia 测试网 | — |

> **Note**: 免费服务首次访问可能需要 30-60 秒冷启动，之后响应正常。

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

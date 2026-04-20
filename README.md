# 🔗 链证通 — 基于区块链的高校实习证明上链系统

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Ethereum-Sepolia-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white" alt="Ethereum">
  <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.IO">
  <img src="https://img.shields.io/badge/IPFS-Pinata-65C2CB?style=for-the-badge&logo=ipfs&logoColor=white" alt="IPFS">
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

基于区块链技术的高校实习证明管理与核验系统，实现证明的**不可篡改存储**、**多方协同数字签名**与**去中心化链上核验**。系统支持五种角色（学生、企业、高校、第三方机构、系统管理员）协作，覆盖实习申请、企业多维评价与 ECDSA 数字签章、高校审核、证书上链（含多方确认机制）、IPFS 去中心化存储、公开核验的完整业务流程。

### 🎯 核心价值

| 特性 | 描述 |
|------|------|
| 🛡️ **防伪可信** | 证书哈希上链存储，基于 Ethereum 智能合约，多方独立签名确认 |
| 🔍 **便捷核验** | 扫码即可核验，支持公开无登录核验（验证码/证书编号/链上哈希） |
| 👥 **五方协作** | 学生、企业、高校、第三方机构、管理员五方角色协同工作 |
| ⛓️ **多方确认** | 高校+企业双方独立钱包签名确认，链上多方共识后自动生效 |
| 🔏 **数字签章** | 企业评价采用 ECDSA 数字签名，EIP-712 结构化签名授权 |
| 📦 **IPFS 存储** | 证书 PDF 上传至 IPFS（Pinata），永久可寻址存储 |
| 🔔 **实时通知** | WebSocket（Socket.IO）实时推送链上事件 |
| 🔄 **自动对账** | 定时对账服务（每5分钟）自动检测并修复链上/链下数据不一致 |
| 🏦 **独立钱包** | 每个机构拥有独立以太坊钱包，密钥 AES-256-GCM 加密存储 |

## 🏗️ 系统架构

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                            🖥️  前端应用层                                     │
│     React 18 + TypeScript + Tailwind CSS + Zustand + Framer Motion           │
│     Socket.IO Client (链上事件实时推送) + Recharts (数据可视化)                  │
│                      部署于 Vercel（全球 CDN）                                 │
├───────────────────────────────────────────────────────────────────────────────┤
│                            ⚙️  后端服务层                                     │
│   Node.js + Express + Prisma ORM + JWT + Ethers.js v6 + Socket.IO Server     │
│   ECDSA 签名服务 + IPFS 服务(Pinata) + 定时对账(node-cron) + PDFKit           │
│                       部署于 Render（免费托管）                                 │
├──────────────────────┬────────────────────────────────────────────────────────┤
│    📦 数据存储层      │                ⛓️  区块链层                             │
│ PostgreSQL (Neon)    │  Ethereum Sepolia + Solidity 0.8.20 + OpenZeppelin     │
│ 16 张数据表          │  V1: 完整功能版  /  V2: Gas 优化版                       │
│ Prisma ORM          │  多方确认机制 + RBAC 权限 + 过期检测                      │
├──────────────────────┼────────────────────────────────────────────────────────┤
│    📦 IPFS 存储      │                🔐 安全层                                │
│ Pinata Gateway      │  AES-256-GCM 密钥加密 + EIP-712 签名                    │
│ 去中心化文件存储      │  AccessControl + Pausable + ReentrancyGuard             │
└──────────────────────┴────────────────────────────────────────────────────────┘
```

## ✨ 功能特性

### 👨‍🎓 学生端
- 实习申请创建、提交与进度跟踪
- 从企业预设岗位列表选择实习岗位
- 证书查看与下载（PDF 导出，含二维码）
- **实习履历（Portfolio）**— 汇总所有实习证明、评分与链上凭证
- 证书分享与核验码生成

### 🏢 企业端
- 实习申请评价与 **ECDSA 数字签章**（不可伪造）
- **多维度评价**：专业能力、团队协作、出勤表现、创新能力、沟通能力（各 1-10 分）
- **岗位管理**（CRUD）— 预设实习岗位供学生选择
- **链上企业确认**（多方确认机制，企业独立钱包签名）

### 🎓 高校端
- 学生白名单管理（支持 Excel 批量导入）
- 实习申请审核与审批、证书签发与上链
- **多方确认机制** — 高校提交请求后自动确认，等待企业确认后自动生效
- 证书撤销（同步链上撤销）、**EIP-712 签名确认弹窗**

### 🔍 第三方机构（HR / 背景调查）
- 证书核验（多种方式）、核验记录面板、区块链存证溯源

### 🛡️ 系统管理员
- 用户注册审批、密码重置审核、机构管理
- **区块链运维中心**：合约状态监控、钱包资产管理（单个/批量充值）、交易管理、链上/链下一致性对账、服务健康检测、合约紧急暂停/恢复

### 🌐 公开核验（无需登录）
- 扫码核验证书真伪、验证码/证书编号/区块链哈希三种核验方式
- 学生信息自动脱敏保护隐私

### 🏠 系统首页（Landing Page）
- 痛点分析、解决方案流程、五大角色功能、四层技术架构、部署架构展示
- 流畅的滚动动画（Framer Motion）

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React 18, TypeScript, Vite 5, Tailwind CSS, Zustand, React Router, Framer Motion, Recharts, Socket.IO Client, react-hook-form, qrcode.react | SPA 单页应用 |
| **后端** | Node.js 18+, Express 4, Prisma 5, JWT, bcryptjs, Ethers.js 6, Socket.IO, PDFKit, xlsx, multer, node-cron, express-validator | RESTful API + WebSocket |
| **数据库** | PostgreSQL 16（Neon Cloud 托管） | 16 张数据表 |
| **区块链** | Ethereum Sepolia, Solidity 0.8.20, Hardhat, OpenZeppelin | RBAC + 多方确认 |
| **存储** | IPFS（Pinata Gateway） | 证书 PDF 去中心化存储 |
| **安全** | AES-256-GCM, EIP-712, ECDSA, JWT + bcrypt | 多层安全保障 |
| **部署** | Vercel（前端）, Render（后端）, Neon（DB）, Pinata（IPFS） | 全部免费托管 |

## 📁 项目结构

```
intern-cert-blockchain/
├── frontend/                        # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/              # UI 组件（6个）
│   │   ├── hooks/                   # 自定义 Hooks（useBlockchainSocket）
│   │   ├── layouts/                 # 页面布局（MainLayout, AuthLayout）
│   │   ├── pages/                   # 页面组件（23个）
│   │   ├── services/api.ts          # Axios 封装（拦截器+冷启动重试）
│   │   ├── stores/authStore.ts      # Zustand 认证状态
│   │   └── App.tsx                  # 路由配置 + 权限守卫
│   ├── vercel.json                  # Vercel SPA 路由重写
│   └── package.json
├── backend/                         # Express + Prisma + TypeScript
│   ├── src/
│   │   ├── routes/                  # API 路由（15个模块）
│   │   ├── services/                # 业务服务层（5个）
│   │   │   ├── blockchain.ts           # 区块链交互+事件监听+机构钱包
│   │   │   ├── certificatePdf.ts       # PDF 生成（PDFKit+QRCode）
│   │   │   ├── signatureService.ts     # ECDSA 数字签名服务
│   │   │   ├── ipfsService.ts          # IPFS 存储（Pinata+重试）
│   │   │   └── reconciliation.ts       # 链上对账（node-cron 每5分钟）
│   │   ├── middleware/              # 认证+错误处理+日志
│   │   ├── config/index.ts          # 系统配置
│   │   └── index.ts                 # Express+Socket.IO 入口
│   ├── prisma/schema.prisma         # 16张表模型定义
│   ├── render.yaml                  # Render 部署配置
│   └── package.json
├── blockchain/                      # Hardhat 智能合约
│   ├── contracts/
│   │   ├── InternshipCertification.sol     # V1 完整功能版（678行）
│   │   └── InternshipCertificationV2.sol   # V2 Gas 优化版（410行）
│   ├── scripts/                     # 部署脚本（deploy/deploy-v2/setup-wallets）
│   ├── test/                        # 合约单元测试（451行，8大场景）
│   ├── deployments/                 # 部署记录
│   └── hardhat.config.ts            # Sepolia + localhost 配置
├── scripts/batch-upchain.ts         # 批量上链工具
├── docker-compose.yml               # Docker 一键启动（4个服务）
└── package.json                     # 根配置（dev:all 并发启动）
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.x · **npm** >= 9.x · **PostgreSQL** >= 15.x（或 Docker）

### 方式一：Docker 一键启动

```bash
git clone https://github.com/AyouTommy/intern-cert-blockchain.git
cd intern-cert-blockchain
docker compose up -d    # 启动 PostgreSQL + Hardhat + 后端 + 前端
```

### 方式二：并发启动（推荐开发）

```bash
npm install && cd backend && npm install && cd ../frontend && npm install && cd ../blockchain && npm install && cd ..
npm run dev:all    # 一键并发启动（区块链节点 + 后端 + 前端）
```

### 方式三：手动分步启动

**1. 配置环境变量** — 后端 `backend/.env`：
```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
JWT_SECRET="your-jwt-secret"
FRONTEND_URL="http://localhost:5173"
BLOCKCHAIN_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/your-key"
SIGNER_PRIVATE_KEY="your-wallet-private-key"
KEY_ENCRYPTION_SECRET="your-32-byte-key"
PINATA_JWT="your-pinata-jwt"           # 可选
```

前端 `frontend/.env`：`VITE_API_URL="http://localhost:3001/api"`

**2. 初始化数据库**
```bash
cd backend && npx prisma generate && npx prisma db push
```

**3. 启动服务**
```bash
cd backend && npm run dev    # 终端1（含 Socket.IO）
cd frontend && npm run dev   # 终端2
```

## ☁️ 部署指南

| 服务 | 平台 | 配置文件 | 关键配置 |
|------|------|----------|----------|
| 数据库 | [Neon](https://neon.tech) | `prisma/schema.prisma` | `DATABASE_URL` |
| 后端 | [Render](https://render.com) | `render.yaml` | 8个环境变量 |
| 前端 | [Vercel](https://vercel.com) | `vercel.json` | `VITE_API_URL` |
| 合约 | Ethereum Sepolia | `hardhat.config.ts` | `SEPOLIA_RPC_URL`, `PRIVATE_KEY` |

**Render 环境变量**：`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `BLOCKCHAIN_RPC_URL`, `SIGNER_PRIVATE_KEY`, `KEY_ENCRYPTION_SECRET`, `PINATA_JWT`（可选）, `NODE_ENV=production`

## 📡 API 文档

### 认证 · 用户

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册（学生白名单验证/机构需审批） | ❌ |
| POST | `/api/auth/login` | 登录，返回 JWT | ❌ |
| GET | `/api/auth/me` | 当前用户信息 | ✅ |
| PATCH | `/api/users/:id/approve` | 审批用户注册 | ✅ Admin |

### 实习申请

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET/POST | `/api/applications` | 申请列表/创建 | ✅ |
| POST | `/api/applications/:id/company-review` | 企业评价签章（ECDSA+多维评分） | ✅ 企业 |
| POST | `/api/applications/:id/university-review` | 高校审核（自动生成证书+多方确认上链） | ✅ 高校 |
| POST | `/api/applications/:id/withdraw` | 撤回申请 | ✅ 学生 |

### 证书管理

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/certificates` | 证书列表 | ✅ |
| POST | `/api/certificates/:id/upchain` | 手动上链（含多方确认） | ✅ 高校/Admin |
| POST | `/api/certificates/:id/revoke` | 撤销证书（链上同步） | ✅ 高校/Admin |
| GET | `/api/certificates/:id/pdf` | 导出 PDF（含 IPFS 上传） | 公开 |

### 公开核验

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/verify/code/:code` | 验证码核验 | ❌ |
| GET | `/api/verify/number/:certNumber` | 证书编号核验 | ❌ |
| GET | `/api/verify/hash/:hash` | 区块链哈希核验 | ❌ |

### 区块链运维

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/stats/blockchain-admin/overview` | 合约概览+安全组件 | ✅ Admin |
| GET | `/api/stats/blockchain-admin/wallets` | 钱包资产列表 | ✅ Admin |
| POST | `/api/stats/blockchain-admin/wallets/:id/fund` | 钱包充值 | ✅ Admin |
| POST | `/api/stats/blockchain-admin/contract/pause` | 暂停合约 | ✅ Admin |
| POST | `/api/stats/blockchain-admin/reconcile` | 手动对账 | ✅ Admin |
| POST | `/api/stats/blockchain-admin/services/test-rpc` | 测试 RPC | ✅ Admin |

### 其他模块

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET/POST/PUT/DELETE | `/api/positions` | 企业岗位管理 | ✅ 企业 |
| POST | `/api/whitelist/import` | Excel 批量导入白名单 | ✅ 高校 |
| GET | `/api/notifications` | 通知列表 | ✅ |
| GET | `/api/stats/dashboard` | 仪表盘统计（含链上数据） | ✅ |

## 🔐 智能合约

### 合约版本

| 版本 | 文件 | 特点 |
|------|------|------|
| **V1** | `InternshipCertification.sol` (678行) | 完整功能版：链上索引数组、分页查询、完整接口 |
| **V2** | `InternshipCertificationV2.sol` (410行) | Gas 优化版：uint64 存储打包、移除链上索引（每次 createCertificate 节省 ~60,000 Gas） |

### 核心函数

| 函数 | 描述 | 权限 |
|------|------|------|
| `createCertificate()` | 直接创建证书上链 | Admin/University/Company |
| `submitCertificateRequest()` | 提交多方确认请求（第1步） | Admin/University |
| `companyConfirm()` | 企业确认（第2步），双方确认后自动生效 | Company |
| `verifyCertificate()` | 验证证书（view函数，不花Gas） | 公开 |
| `revokeCertificate()` | 撤销证书 | 签发者/Admin |
| `batchCreateCertificates()` | 批量上链（V2 ≤20条） | Admin/University |
| `pause()` / `unpause()` | 合约紧急暂停/恢复 | Admin |

### 多方确认机制

```
高校提交请求 ──→ 高校自动确认 ──→ 等待企业确认 ──→ 双方确认 ──→ 自动生效
(submitCertificateRequest)      (companyConfirm)         (_finalizeCertificate)
```

### 安全特性

- ✅ **AccessControl** — 基于角色的权限管理（Admin / University / Company）
- ✅ **Pausable** — 紧急暂停机制
- ✅ **ReentrancyGuard** — 重入攻击防护
- ✅ **事件日志** — 7种链上事件追踪
- ✅ **过期检测** — 实习结束日期 + 5年有效期
- ✅ **内容完整性验证** — 链上存储 contentHash

### 合约测试（8大场景）

部署验证 · 直接创建 · 多方确认 · 验证（view） · 过期检测 · 内容完整性 · 撤销 · 批量创建 · 暂停功能

## 📊 数据库模型（16张表）

| 表名 | 描述 | 关键字段 |
|------|------|----------|
| User | 用户表 | email, role(5种), walletAddress, approvalStatus |
| StudentProfile | 学生档案 | studentId, major, department |
| University | 高校 | code, walletAddress, encryptedPrivKey |
| Company | 企业 | code, industry, walletAddress, encryptedPrivKey |
| ThirdPartyOrg | 第三方机构 | code, type(HR/RECRUITER/BACKGROUND_CHECK) |
| Certificate | 实习证明 | certHash, txHash, status, verifyCode, universityAddr, companyAddr, contentHash, ipfsHash |
| InternshipApplication | 实习申请 | applicationNo, status(8种), companyScore, companySignature, 5维评分 |
| StudentWhitelist | 学生白名单 | studentId, isUsed, universityId, batchId |
| Verification | 核验记录 | verifierIp, isValid, verifySource |
| AuditLog | 审计日志 | action, signatureMethod, gasUsed |
| Notification | 通知 | title, type, isRead, link |
| Position | 企业岗位 | title, department, companyId |
| Attachment | 附件 | fileName, fileHash, category |
| CertificateTemplate | 证书模板 | name, content, isDefault |
| PasswordResetRequest | 密码重置 | userId, status, rejectReason |
| SystemConfig | 系统配置 | key, value |

## 🔒 安全机制

| 安全特性 | 实现方式 | 说明 |
|----------|----------|------|
| 机构独立钱包 | `blockchain.ts` | 注册时自动生成独立以太坊钱包 |
| 密钥加密存储 | AES-256-GCM | 私钥加密后存入数据库 |
| ECDSA 签章 | `signatureService.ts` | 企业评价不可伪造签名 |
| EIP-712 签名 | `SignatureConfirmModal.tsx` | 链上操作授权确认 |
| JWT 认证 | `middleware/auth.ts` | 请求认证 + 5种角色授权 |
| 链上权限 | OpenZeppelin AccessControl | 3种链上角色 |
| 重入防护 | ReentrancyGuard | 合约重入攻击防护 |
| 内容完整性 | contentHash | 链上存储哈希，检测篡改 |

## 🔄 实时通信架构

```
链上事件                    后端 Socket.IO               前端 Hook
────────────────────────────────────────────────────────────────
CertificateCreated    →    事件监听+DB补偿    →    toast("证书已上链")
CertificateRevoked    →    状态同步REVOKED    →    toast("证书已撤销")
CertificateFinalized  →    多方确认同步       →    toast("多方确认完成")
ConfirmationReceived  →    WebSocket推送      →    toast("收到确认")
```

- **后端**：`BlockchainService.listenForEvents()` 监听链上事件
- **前端**：`useBlockchainSocket()` Hook 连接 Socket.IO
- **定时对账**：`reconciliation.ts` 每5分钟扫描超时 PENDING 证书

## 🌐 在线演示

| 服务 | 地址 |
|------|------|
| 🖥️ 前端 | https://intern-cert-blockchain.vercel.app |
| 📡 后端 | https://intern-cert-api.onrender.com |
| 🗄️ 数据库 | Neon Cloud (PostgreSQL) |
| ⛓️ 合约 | Ethereum Sepolia 测试网 |
| 📦 IPFS | Pinata Gateway |

> 后端通过 [UptimeRobot](https://uptimerobot.com) 每5分钟自动保活，服务 100% 在线，无需等待冷启动。

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

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// 路由导入
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import certificateRoutes from './routes/certificates';
import universityRoutes from './routes/universities';
import companyRoutes from './routes/companies';
import verifyRoutes from './routes/verify';
import statsRoutes from './routes/stats';
import templateRoutes from './routes/templates';
import attachmentRoutes from './routes/attachments';
import whitelistRoutes from './routes/whitelist';
import applicationRoutes from './routes/applications';
import notificationRoutes from './routes/notifications';
import thirdPartyOrgRoutes from './routes/thirdPartyOrgs';
import orgAdminRoutes from './routes/orgAdmins';
import positionRoutes from './routes/positions';

// 中间件导入
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// 服务导入
import { startReconciliationJob } from './services/reconciliation';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
});
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors({
  origin: (origin, callback) => {
    // 允许所有来源（开发环境）
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Prisma中间件
app.use((req, res, next) => {
  (req as any).prisma = prisma;
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Internship Certification API'
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/whitelist', whitelistRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/third-party-orgs', thirdPartyOrgRoutes);
app.use('/api/org-admins', orgAdminRoutes);
app.use('/api/positions', positionRoutes);

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// 错误处理
app.use(errorHandler);

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log(`🔗 WebSocket 客户端连接: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket 客户端断开: ${socket.id}`);
  });
});

// 将 Socket.IO 绑定到 BlockchainService（链上事件 → 前端推送）
import { BlockchainService } from './services/blockchain';
BlockchainService.setSocketIO(io);

// 启动服务器
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎓 高校实习证明上链系统 API 服务                          ║
║                                                            ║
║   服务地址: http://localhost:${PORT}                         ║
║   健康检查: http://localhost:${PORT}/health                  ║
║   环境: ${process.env.NODE_ENV || 'development'}                                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  // 启动链上状态定时对账服务
  startReconciliationJob();

  // 为已有机构补生成独立钱包
  migrateOrgWallets();
});

// 启动时检查并补全机构独立钱包
async function migrateOrgWallets() {
  try {
    const blockchain = new BlockchainService();

    // 补全高校钱包
    const unisMissing = await prisma.university.findMany({
      where: { walletAddress: null },
    });
    for (const uni of unisMissing) {
      const { address, encryptedPrivKey } = blockchain.generateInstitutionWallet();
      await prisma.university.update({
        where: { id: uni.id },
        data: { walletAddress: address, encryptedPrivKey, keyCreatedAt: new Date() },
      });
      await blockchain.grantInstitutionRole(address, 'university', uni.id);
      await blockchain.fundInstitutionWallet(address);
      console.log(`🔑 [迁移] 高校 ${uni.name} 独立钱包已补生成: ${address}`);
    }

    // 补全企业钱包
    const compsMissing = await prisma.company.findMany({
      where: { walletAddress: null },
    });
    for (const comp of compsMissing) {
      const { address, encryptedPrivKey } = blockchain.generateInstitutionWallet();
      await prisma.company.update({
        where: { id: comp.id },
        data: { walletAddress: address, encryptedPrivKey, keyCreatedAt: new Date() },
      });
      await blockchain.grantInstitutionRole(address, 'company', comp.id);
      await blockchain.fundInstitutionWallet(address);
      console.log(`🔑 [迁移] 企业 ${comp.name} 独立钱包已补生成: ${address}`);
    }

    if (unisMissing.length || compsMissing.length) {
      console.log(`✅ 机构钱包迁移完成: ${unisMissing.length} 所高校, ${compsMissing.length} 家企业`);
    }
  } catch (error) {
    console.warn('⚠️ 机构钱包迁移跳过（可能区块链未连接）:', (error as any).message);
  }
}

export { prisma };

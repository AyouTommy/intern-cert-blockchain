import express from 'express';
import cors from 'cors';
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

// 中间件导入
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

dotenv.config();

const app = express();
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

// 启动服务器
app.listen(PORT, () => {
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
});

export { prisma };

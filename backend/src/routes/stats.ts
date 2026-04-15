import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { blockchainService } from '../services/blockchain';
import { ethers } from 'ethers';
import * as ipfsService from '../services/ipfsService';

const router = Router();

// 获取仪表盘统计
router.get(
  '/dashboard',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;

      // 构建查询条件（根据角色）
      const certWhere: any = {};
      if (authReq.user!.role === 'UNIVERSITY') {
        certWhere.universityId = authReq.user!.universityId;
      } else if (authReq.user!.role === 'COMPANY') {
        certWhere.companyId = authReq.user!.companyId;
      } else if (authReq.user!.role === 'STUDENT') {
        const profile = await prisma.studentProfile.findUnique({
          where: { userId: authReq.user!.id },
        });
        if (profile) {
          certWhere.studentId = profile.id;
        }
      }

      // 基础统计
      const [
        totalCertificates,
        activeCertificates,
        pendingCertificates,
        revokedCertificates,
        totalUniversities,
        totalCompanies,
        totalStudents,
        recentVerifications,
      ] = await Promise.all([
        prisma.certificate.count({ where: certWhere }),
        prisma.certificate.count({ where: { ...certWhere, status: 'ACTIVE' } }),
        prisma.certificate.count({ where: { ...certWhere, status: 'PENDING' } }),
        prisma.certificate.count({ where: { ...certWhere, status: 'REVOKED' } }),
        prisma.university.count(),
        prisma.company.count(),
        prisma.studentProfile.count(),
        prisma.verification.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      // 最近7天的证明趋势
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentCerts = await prisma.certificate.findMany({
        where: {
          ...certWhere,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { createdAt: true, status: true },
      });

      // 按天分组
      const dailyStats: Record<string, { created: number; active: number }> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = date.toISOString().split('T')[0];
        dailyStats[key] = { created: 0, active: 0 };
      }

      recentCerts.forEach((cert) => {
        const key = cert.createdAt.toISOString().split('T')[0];
        if (dailyStats[key]) {
          dailyStats[key].created++;
          if (cert.status === 'ACTIVE') {
            dailyStats[key].active++;
          }
        }
      });

      const trend = Object.entries(dailyStats)
        .map(([date, stats]) => ({ date, ...stats }))
        .reverse();

      res.json({
        success: true,
        data: {
          overview: {
            totalCertificates,
            activeCertificates,
            pendingCertificates,
            revokedCertificates,
            totalUniversities,
            totalCompanies,
            totalStudents,
            recentVerifications,
          },
          trend,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取证明状态分布
router.get(
  '/certificates/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;

      const statusCounts = await prisma.certificate.groupBy({
        by: ['status'],
        _count: { status: true },
      });

      const distribution = statusCounts.map((item) => ({
        status: item.status,
        count: item._count.status,
      }));

      res.json({
        success: true,
        data: distribution,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取高校排名
router.get(
  '/universities/ranking',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;

      const universities = await prisma.university.findMany({
        select: {
          id: true,
          name: true,
          logo: true,
          _count: {
            select: { certificates: true },
          },
        },
        orderBy: {
          certificates: { _count: 'desc' },
        },
        take: 10,
      });

      res.json({
        success: true,
        data: universities.map((u) => ({
          id: u.id,
          name: u.name,
          logo: u.logo,
          count: u._count.certificates,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取企业排名
router.get(
  '/companies/ranking',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;

      const companies = await prisma.company.findMany({
        select: {
          id: true,
          name: true,
          logo: true,
          industry: true,
          _count: {
            select: { certificates: true },
          },
        },
        orderBy: {
          certificates: { _count: 'desc' },
        },
        take: 10,
      });

      res.json({
        success: true,
        data: companies.map((c) => ({
          id: c.id,
          name: c.name,
          logo: c.logo,
          industry: c.industry,
          count: c._count.certificates,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取验证统计
router.get(
  '/verifications',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { days = 30 } = req.query;

      const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

      const verifications = await prisma.verification.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          isValid: true,
        },
      });

      // 按天分组
      const dailyStats: Record<string, { total: number; valid: number; invalid: number }> = {};

      verifications.forEach((v) => {
        const key = v.createdAt.toISOString().split('T')[0];
        if (!dailyStats[key]) {
          dailyStats[key] = { total: 0, valid: 0, invalid: 0 };
        }
        dailyStats[key].total++;
        if (v.isValid) {
          dailyStats[key].valid++;
        } else {
          dailyStats[key].invalid++;
        }
      });

      const data = Object.entries(dailyStats)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 导出报表
router.get(
  '/export',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { startDate, endDate, type = 'certificates' } = req.query;

      const where: any = {};
      if (startDate) {
        where.createdAt = { gte: new Date(startDate as string) };
      }
      if (endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };
      }

      if (authReq.user!.role === 'UNIVERSITY') {
        where.universityId = authReq.user!.universityId;
      }

      const certificates = await prisma.certificate.findMany({
        where,
        include: {
          student: { include: { user: { select: { name: true } } } },
          university: { select: { name: true } },
          company: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const exportData = certificates.map((cert) => ({
        证明编号: cert.certNumber,
        学生姓名: cert.student.user.name,
        学号: cert.student.studentId,
        高校: cert.university.name,
        企业: cert.company.name,
        岗位: cert.position,
        开始日期: cert.startDate.toISOString().split('T')[0],
        结束日期: cert.endDate.toISOString().split('T')[0],
        状态: cert.status,
        区块链哈希: cert.certHash || '未上链',
        创建时间: cert.createdAt.toISOString(),
      }));

      res.json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 区块链详细信息 API（Settings页面用）
router.get(
  '/blockchain-info',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAvailable = blockchainService.isContractAvailable();
      const address = blockchainService.getContractAddress();

      let networkInfo = { chainId: 0, name: 'unknown', blockNumber: 0 };
      let wallets = { adminAddr: '', universityAddr: '', companyAddr: '' };
      let contractStats = null;

      if (isAvailable) {
        try { networkInfo = await blockchainService.getNetworkInfo(); } catch {}
        wallets = blockchainService.getMultiPartyInfo();
        try {
          const result = await blockchainService.getStatistics();
          if (result.success) contractStats = result.stats;
        } catch {}
      }

      // 如果有认证用户，返回其机构的独立钱包地址
      let orgWallet: { universityAddr?: string; companyAddr?: string } = {};
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const jwt = await import('jsonwebtoken');
          const token = authHeader.slice(7);
          const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
          const prisma = (req as any).prisma;

          if (decoded.universityId) {
            const uni = await prisma.university.findUnique({
              where: { id: decoded.universityId },
              select: { walletAddress: true },
            });
            if (uni?.walletAddress) orgWallet.universityAddr = uni.walletAddress;
          }
          if (decoded.companyId) {
            const comp = await prisma.company.findUnique({
              where: { id: decoded.companyId },
              select: { walletAddress: true },
            });
            if (comp?.walletAddress) orgWallet.companyAddr = comp.walletAddress;
          }
        } catch {}
      }

      res.json({
        success: true,
        data: {
          connected: isAvailable,
          network: {
            name: networkInfo.chainId === 11155111 ? 'Sepolia Testnet'
              : networkInfo.chainId === 31337 ? 'Hardhat Local'
              : networkInfo.name,
            chainId: networkInfo.chainId,
            blockNumber: networkInfo.blockNumber,
          },
          contract: {
            address: address,
            deployed: isAvailable,
          },
          wallets: {
            admin: wallets.adminAddr,
            university: orgWallet.universityAddr || wallets.universityAddr,
            company: orgWallet.companyAddr || wallets.companyAddr,
          },
          features: {
            multiPartyConfirmation: true,
            autoRetry: { enabled: true, maxRetries: 3 },
          },
          gas: {
            deployGasUsed: 3975426,
            estimatePerCert: 185000,
            estimateVerify: 45000,
          },
          stats: contractStats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);


// ==========================================
//  区块链运维中心 - 仅管理员
// ==========================================

// 总览概况
router.get(
  '/blockchain-admin/overview',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as AuthRequest).prisma;
      const isAvailable = blockchainService.isContractAvailable();

      let contractInfo: any = { connected: false };
      if (isAvailable) {
        try {
          const networkInfo = await blockchainService.getNetworkInfo();
          const stats = await blockchainService.getStatistics();
          const multiParty = blockchainService.getMultiPartyInfo();

          // 检查合约暂停状态
          let paused = false;
          try {
            const contract = (blockchainService as any).contract;
            if (contract) paused = await contract.paused();
          } catch {}

          contractInfo = {
            connected: true,
            address: blockchainService.getContractAddress(),
            network: {
              name: networkInfo.chainId === 11155111 ? 'Sepolia Testnet' : networkInfo.chainId === 31337 ? 'Hardhat Local' : networkInfo.name,
              chainId: networkInfo.chainId,
              blockNumber: networkInfo.blockNumber,
            },
            paused,
            stats: stats.success ? stats.stats : null,
            adminWallet: multiParty.adminAddr,
          };
        } catch (e: any) {
          contractInfo = { connected: false, error: e.message };
        }
      }

      // DB 统计
      const [totalCerts, activeCerts, revokedCerts, failedCerts, totalVerifications, totalUsers] = await Promise.all([
        prisma.certificate.count(),
        prisma.certificate.count({ where: { status: 'ACTIVE' } }),
        prisma.certificate.count({ where: { status: 'REVOKED' } }),
        prisma.certificate.count({ where: { status: 'FAILED' } }),
        prisma.verification.count(),
        prisma.user.count(),
      ]);

      const totalTransactions = await prisma.certificate.count({ where: { txHash: { not: null } } });

      res.json({
        success: true,
        data: {
          contract: contractInfo,
          summary: {
            totalCerts,
            activeCerts,
            revokedCerts,
            failedCerts,
            totalTransactions,
            totalVerifications,
            totalUsers,
          },
          security: [
            { name: 'AccessControl', desc: '基于角色的链上权限控制' },
            { name: 'Pausable', desc: '紧急暂停机制' },
            { name: 'ReentrancyGuard', desc: '防重入攻击保护' },
          ],
          architecture: [
            { name: '多方确认机制', desc: '高校提交签发请求，企业独立确认，双方签名地址链上记录' },
            { name: '机构独立密钥', desc: 'AES-256-GCM 加密存储机构私钥，EIP-712 类型化签名' },
            { name: '存储优化', desc: '时间戳和区块号使用 uint64 打包，减少存储槽占用' },
            { name: '事件同步', desc: 'Alchemy WebSocket 实时监听 + Cron 定时对账 + Socket.IO 推送' },
            { name: 'IPFS 集成', desc: '上链成功后自动生成PDF上传IPFS，降级策略不影响核心功能' },
          ],
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 钱包资产
router.get(
  '/blockchain-admin/wallets',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as AuthRequest).prisma;
      const provider = (blockchainService as any).provider as ethers.JsonRpcProvider;
      const multiParty = blockchainService.getMultiPartyInfo();

      const wallets: any[] = [];
      try {
        const adminBal = await provider.getBalance(multiParty.adminAddr);
        wallets.push({
          id: 'admin',
          label: '管理员钱包 (系统主钱包)',
          type: 'admin',
          address: multiParty.adminAddr,
          balance: ethers.formatEther(adminBal),
        });
      } catch {}

      const universities = await prisma.university.findMany({
        where: { walletAddress: { not: null } },
        select: { id: true, name: true, walletAddress: true },
      });
      for (const uni of universities) {
        try {
          const bal = await provider.getBalance(uni.walletAddress!);
          wallets.push({
            id: uni.id, label: uni.name, type: 'university',
            address: uni.walletAddress, balance: ethers.formatEther(bal),
          });
        } catch {
          wallets.push({
            id: uni.id, label: uni.name, type: 'university',
            address: uni.walletAddress, balance: '0',
          });
        }
      }

      const companies = await prisma.company.findMany({
        where: { walletAddress: { not: null } },
        select: { id: true, name: true, walletAddress: true },
      });
      for (const comp of companies) {
        try {
          const bal = await provider.getBalance(comp.walletAddress!);
          wallets.push({
            id: comp.id, label: comp.name, type: 'company',
            address: comp.walletAddress, balance: ethers.formatEther(bal),
          });
        } catch {
          wallets.push({
            id: comp.id, label: comp.name, type: 'company',
            address: comp.walletAddress, balance: '0',
          });
        }
      }

      res.json({ success: true, data: { wallets } });
    } catch (error) {
      next(error);
    }
  }
);

// 手动充值单个钱包
router.post(
  '/blockchain-admin/wallets/:id/fund',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as AuthRequest).prisma;
      const { id } = req.params;
      const { amount = '0.01' } = req.body;

      let targetAddress: string | null = null;
      let targetName = '';

      const uni = await prisma.university.findUnique({ where: { id }, select: { walletAddress: true, name: true } });
      if (uni?.walletAddress) { targetAddress = uni.walletAddress; targetName = uni.name; }

      if (!targetAddress) {
        const comp = await prisma.company.findUnique({ where: { id }, select: { walletAddress: true, name: true } });
        if (comp?.walletAddress) { targetAddress = comp.walletAddress; targetName = comp.name; }
      }

      if (!targetAddress) {
        return res.status(404).json({ success: false, message: '未找到该机构钱包' });
      }

      const signer = (blockchainService as any).signer as ethers.Wallet;
      const tx = await signer.sendTransaction({
        to: targetAddress,
        value: ethers.parseEther(amount),
      });
      await tx.wait(1);

      res.json({
        success: true,
        data: { txHash: tx.hash, to: targetAddress, name: targetName, amount },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || '充值失败' });
    }
  }
);

// 批量补充低余额钱包
router.post(
  '/blockchain-admin/wallets/fund-low',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as AuthRequest).prisma;
      const provider = (blockchainService as any).provider as ethers.JsonRpcProvider;
      const signer = (blockchainService as any).signer as ethers.Wallet;
      const threshold = ethers.parseEther('0.01');
      const fundAmount = ethers.parseEther('0.01');

      const institutions = [
        ...(await prisma.university.findMany({ where: { walletAddress: { not: null } }, select: { name: true, walletAddress: true } })),
        ...(await prisma.company.findMany({ where: { walletAddress: { not: null } }, select: { name: true, walletAddress: true } })),
      ];

      const results: any[] = [];
      for (const inst of institutions) {
        try {
          const bal = await provider.getBalance(inst.walletAddress!);
          if (bal < threshold) {
            const tx = await signer.sendTransaction({ to: inst.walletAddress!, value: fundAmount });
            await tx.wait(1);
            results.push({ name: inst.name, address: inst.walletAddress, txHash: tx.hash, status: 'funded' });
          }
        } catch (e: any) {
          results.push({ name: inst.name, address: inst.walletAddress, status: 'failed', error: e.message });
        }
      }

      res.json({ success: true, data: { funded: results.filter(r => r.status === 'funded').length, results } });
    } catch (error) {
      next(error);
    }
  }
);

// 交易记录
router.get(
  '/blockchain-admin/transactions',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as AuthRequest).prisma;
      const { type, keyword, page = '1', pageSize = '20' } = req.query;

      const where: any = {};
      if (type === 'failed') {
        where.status = 'FAILED';
      } else if (type === 'active') {
        where.status = 'ACTIVE';
        where.txHash = { not: null };
      } else if (type === 'revoked') {
        where.status = 'REVOKED';
      } else if (type === 'pending') {
        where.status = { in: ['PENDING', 'PROCESSING'] };
      } else {
        where.OR = [
          { txHash: { not: null } },
          { status: 'FAILED' },
          { status: 'PROCESSING' },
        ];
      }

      if (keyword) {
        where.certNumber = { contains: keyword as string, mode: 'insensitive' };
      }

      const skip = (Number(page) - 1) * Number(pageSize);
      const [total, certs] = await Promise.all([
        prisma.certificate.count({ where }),
        prisma.certificate.findMany({
          where,
          select: {
            id: true, certNumber: true, certHash: true, txHash: true,
            blockNumber: true, status: true, failReason: true, retryCount: true,
            updatedAt: true,
            student: { select: { user: { select: { name: true } } } },
            university: { select: { name: true } },
            company: { select: { name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: Number(pageSize),
        }),
      ]);

      res.json({
        success: true,
        data: {
          total,
          page: Number(page),
          pageSize: Number(pageSize),
          records: certs.map(c => ({
            id: c.id, certNumber: c.certNumber, certHash: c.certHash,
            txHash: c.txHash, blockNumber: c.blockNumber, status: c.status,
            failReason: c.failReason, retryCount: c.retryCount,
            studentName: c.student?.user?.name,
            university: c.university?.name,
            company: c.company?.name,
            time: c.updatedAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 重试失败交易
router.post(
  '/blockchain-admin/transactions/:certId/retry',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as AuthRequest).prisma;
      const { certId } = req.params;

      const cert = await prisma.certificate.findUnique({ where: { id: certId } });
      if (!cert) return res.status(404).json({ success: false, message: '证书不存在' });
      if (cert.status !== 'FAILED') return res.status(400).json({ success: false, message: '仅失败状态的证书可重试' });

      await prisma.certificate.update({
        where: { id: certId },
        data: { status: 'PENDING', failReason: null, retryCount: 0 },
      });

      res.json({ success: true, message: '已重置状态，Cron 任务将自动拾取并重试上链' });
    } catch (error) {
      next(error);
    }
  }
);

// 链上/链下对账
router.post(
  '/blockchain-admin/reconcile',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as AuthRequest).prisma;
      if (!blockchainService.isContractAvailable()) {
        return res.status(503).json({ success: false, message: '区块链服务未连接' });
      }

      const activeCerts = await prisma.certificate.findMany({
        where: { status: 'ACTIVE', certHash: { not: null } },
        select: { id: true, certNumber: true, certHash: true },
      });

      const inconsistent: any[] = [];
      let checkedCount = 0;

      for (const cert of activeCerts) {
        try {
          const chainResult = await blockchainService.verifyCertificate(cert.certHash!);
          checkedCount++;
          if (!chainResult.isValid) {
            inconsistent.push({
              certNumber: cert.certNumber, certHash: cert.certHash,
              dbStatus: 'ACTIVE', chainStatus: 'INVALID',
            });
          }
        } catch {
          inconsistent.push({
            certNumber: cert.certNumber, certHash: cert.certHash,
            dbStatus: 'ACTIVE', chainStatus: 'ERROR',
          });
        }
      }

      res.json({
        success: true,
        data: {
          checkedCount, totalActive: activeCerts.length,
          inconsistentCount: inconsistent.length,
          isConsistent: inconsistent.length === 0,
          inconsistent,
          checkedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 服务健康检查
router.get(
  '/blockchain-admin/services',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as AuthRequest).prisma;
      const services: any[] = [];

      // 1. 区块链 RPC
      try {
        const blockNumber = await (blockchainService as any).provider.getBlockNumber();
        services.push({ name: '区块链 RPC (Alchemy)', status: 'ok', detail: `最新区块 #${blockNumber}` });
      } catch (e: any) {
        services.push({ name: '区块链 RPC (Alchemy)', status: 'error', detail: e.message });
      }

      // 2. 智能合约
      services.push({
        name: '智能合约',
        status: blockchainService.isContractAvailable() ? 'ok' : 'error',
        detail: blockchainService.isContractAvailable() ? `地址 ${blockchainService.getContractAddress()}` : '未连接',
      });

      // 3. IPFS
      services.push({
        name: 'IPFS (Pinata)',
        status: ipfsService.isConfigured() ? 'ok' : 'warning',
        detail: ipfsService.isConfigured() ? '已配置' : '未配置 Pinata 凭据（PINATA_JWT 或 PINATA_API_KEY/PINATA_API_SECRET）',
      });

      // 4. 数据库
      try {
        await prisma.$queryRaw`SELECT 1`;
        const [userCount, certCount, verifyCount] = await Promise.all([
          prisma.user.count(), prisma.certificate.count(), prisma.verification.count(),
        ]);
        services.push({
          name: '数据库 (PostgreSQL)',
          status: 'ok',
          detail: `用户 ${userCount} / 证书 ${certCount} / 核验 ${verifyCount}`,
        });
      } catch (e: any) {
        services.push({ name: '数据库 (PostgreSQL)', status: 'error', detail: e.message });
      }

      // 5. WebSocket
      const wsProvider = (blockchainService as any).wsProvider;
      services.push({
        name: 'Alchemy WebSocket',
        status: wsProvider ? 'ok' : 'warning',
        detail: wsProvider ? '事件监听中' : 'HTTP 模式 (无实时事件)',
      });

      res.json({ success: true, data: { services, checkedAt: new Date().toISOString() } });
    } catch (error) {
      next(error);
    }
  }
);

// 测试 RPC 连接
router.post(
  '/blockchain-admin/services/test-rpc',
  authenticate,
  authorize('ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const start = Date.now();
      const blockNumber = await (blockchainService as any).provider.getBlockNumber();
      const latency = Date.now() - start;
      res.json({ success: true, data: { blockNumber, latencyMs: latency } });
    } catch (error: any) {
      res.status(503).json({ success: false, message: error.message });
    }
  }
);

// 测试 IPFS 连接
router.post(
  '/blockchain-admin/services/test-ipfs',
  authenticate,
  authorize('ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      if (!ipfsService.isConfigured()) {
        return res.status(503).json({ success: false, message: 'Pinata 凭据未配置（PINATA_JWT 或 PINATA_API_KEY/PINATA_API_SECRET）' });
      }
      const testBuffer = Buffer.from(`IPFS connection test - ${new Date().toISOString()}`);
      const cid = await ipfsService.uploadToIPFS(testBuffer, 'test-connection.txt');
      res.json({ success: true, data: { cid, gatewayUrl: ipfsService.getIPFSUrl(cid) } });
    } catch (error: any) {
      res.status(503).json({ success: false, message: error.message });
    }
  }
);

// 暂停合约
router.post(
  '/blockchain-admin/contract/pause',
  authenticate,
  authorize('ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = (blockchainService as any).contract;
      if (!contract) return res.status(503).json({ success: false, message: '合约未连接' });
      const tx = await contract.pause();
      await tx.wait(1);
      res.json({ success: true, data: { txHash: tx.hash } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// 恢复合约
router.post(
  '/blockchain-admin/contract/unpause',
  authenticate,
  authorize('ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = (blockchainService as any).contract;
      if (!contract) return res.status(503).json({ success: false, message: '合约未连接' });
      const tx = await contract.unpause();
      await tx.wait(1);
      res.json({ success: true, data: { txHash: tx.hash } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;

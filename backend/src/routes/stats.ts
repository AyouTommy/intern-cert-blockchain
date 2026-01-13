import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { blockchainService } from '../services/blockchain';

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

      // 区块链统计
      let blockchainStats = null;
      if (blockchainService.isContractAvailable()) {
        const result = await blockchainService.getStatistics();
        if (result.success) {
          blockchainStats = result.stats;
        }
      }

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
          blockchain: blockchainStats,
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

export default router;

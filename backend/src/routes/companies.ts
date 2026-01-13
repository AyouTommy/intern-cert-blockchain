import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 获取企业列表
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { page = 1, limit = 10, search, industry } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string } },
          { code: { contains: search as string } },
        ];
      }

      if (industry) {
        where.industry = industry;
      }

      const [companies, total] = await Promise.all([
        prisma.company.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            code: true,
            name: true,
            englishName: true,
            industry: true,
            scale: true,
            province: true,
            city: true,
            logo: true,
            website: true,
            isVerified: true,
            _count: {
              select: { certificates: true },
            },
          },
        }),
        prisma.company.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          companies,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取企业详情
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { id } = req.params;

      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              certificates: true,
            },
          },
        },
      });

      if (!company) {
        throw new AppError('企业不存在', 404);
      }

      res.json({
        success: true,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 创建企业
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const {
        code,
        name,
        englishName,
        industry,
        scale,
        province,
        city,
        address,
        logo,
        website,
        contactPerson,
        contactPhone,
        contactEmail,
        walletAddress,
      } = req.body;

      const company = await prisma.company.create({
        data: {
          code,
          name,
          englishName,
          industry,
          scale,
          province,
          city,
          address,
          logo,
          website,
          contactPerson,
          contactPhone,
          contactEmail,
          walletAddress,
        },
      });

      res.status(201).json({
        success: true,
        message: '企业创建成功',
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 更新企业
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      // 检查权限
      if (authReq.user!.role === 'COMPANY' && authReq.user!.companyId !== id) {
        throw new AppError('无权修改其他企业信息', 403);
      }

      const {
        name,
        englishName,
        industry,
        scale,
        province,
        city,
        address,
        logo,
        website,
        contactPerson,
        contactPhone,
        contactEmail,
        walletAddress,
      } = req.body;

      const company = await prisma.company.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(englishName && { englishName }),
          ...(industry && { industry }),
          ...(scale && { scale }),
          ...(province && { province }),
          ...(city && { city }),
          ...(address && { address }),
          ...(logo && { logo }),
          ...(website && { website }),
          ...(contactPerson && { contactPerson }),
          ...(contactPhone && { contactPhone }),
          ...(contactEmail && { contactEmail }),
          ...(walletAddress && { walletAddress }),
        },
      });

      res.json({
        success: true,
        message: '企业更新成功',
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 验证企业
router.patch(
  '/:id/verify',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      await prisma.company.update({
        where: { id },
        data: { isVerified: true },
      });

      res.json({
        success: true,
        message: '企业已验证',
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除企业
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      const count = await prisma.certificate.count({
        where: { companyId: id },
      });

      if (count > 0) {
        throw new AppError('该企业存在关联证明，无法删除', 400);
      }

      await prisma.company.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: '企业已删除',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

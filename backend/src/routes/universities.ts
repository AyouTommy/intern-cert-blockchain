import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 获取高校列表
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { page = 1, limit = 10, search } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string } },
          { code: { contains: search as string } },
          { city: { contains: search as string } },
        ];
      }

      const [universities, total] = await Promise.all([
        prisma.university.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            code: true,
            name: true,
            englishName: true,
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
        prisma.university.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          universities,
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

// 获取高校详情
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { id } = req.params;

      const university = await prisma.university.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              certificates: true,
              templates: true,
            },
          },
        },
      });

      if (!university) {
        throw new AppError('高校不存在', 404);
      }

      res.json({
        success: true,
        data: university,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 创建高校
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { code, name, englishName, province, city, address, logo, website, walletAddress } = req.body;

      const university = await prisma.university.create({
        data: {
          code,
          name,
          englishName,
          province,
          city,
          address,
          logo,
          website,
          walletAddress,
        },
      });

      res.status(201).json({
        success: true,
        message: '高校创建成功',
        data: university,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 更新高校
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;
      const { name, englishName, province, city, address, logo, website, walletAddress } = req.body;

      // 检查权限
      if (authReq.user!.role === 'UNIVERSITY' && authReq.user!.universityId !== id) {
        throw new AppError('无权修改其他高校信息', 403);
      }

      const university = await prisma.university.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(englishName && { englishName }),
          ...(province && { province }),
          ...(city && { city }),
          ...(address && { address }),
          ...(logo && { logo }),
          ...(website && { website }),
          ...(walletAddress && { walletAddress }),
        },
      });

      res.json({
        success: true,
        message: '高校更新成功',
        data: university,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 验证高校
router.patch(
  '/:id/verify',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      await prisma.university.update({
        where: { id },
        data: { isVerified: true },
      });

      res.json({
        success: true,
        message: '高校已验证',
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除高校（管理员强制删除，级联清理所有关联数据）
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      const university = await prisma.university.findUnique({
        where: { id },
      });

      if (!university) {
        throw new AppError('高校不存在', 404);
      }

      // 1. 获取该高校关联的所有证书
      const certificates = await prisma.certificate.findMany({
        where: { universityId: id },
        select: { id: true },
      });
      const certIds = certificates.map((c: any) => c.id);

      if (certIds.length > 0) {
        // 删除证书的核验记录
        await prisma.verification.deleteMany({
          where: { certificateId: { in: certIds } },
        });

        // 解除申请与证书的关联
        await prisma.internshipApplication.updateMany({
          where: { certificateId: { in: certIds } },
          data: { certificateId: null },
        });

        // 删除证书（附件会因为 onDelete: Cascade 自动删除）
        await prisma.certificate.deleteMany({
          where: { id: { in: certIds } },
        });
      }

      // 2. 删除该高校关联的实习申请
      await prisma.internshipApplication.deleteMany({
        where: { universityId: id },
      });

      // 3. 删除该高校关联的证书模板
      await prisma.certificateTemplate.deleteMany({
        where: { universityId: id },
      });

      // 4. 删除/解除该高校关联的白名单
      await prisma.studentWhitelist.deleteMany({
        where: { universityId: id },
      });

      // 5. 解除用户与高校的关联（不删除用户，只解除关联）
      await prisma.user.updateMany({
        where: { universityId: id },
        data: { universityId: null },
      });

      // 6. 删除高校
      await prisma.university.delete({
        where: { id },
      });

      // 记录日志
      await prisma.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'DELETE_UNIVERSITY',
          entityType: 'University',
          entityId: id,
          newValue: JSON.stringify({ name: university.name, code: university.code }),
        },
      });

      res.json({
        success: true,
        message: '高校已删除',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

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

// 删除高校
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      // 检查是否有关联数据
      const count = await prisma.certificate.count({
        where: { universityId: id },
      });

      if (count > 0) {
        throw new AppError('该高校存在关联证明，无法删除', 400);
      }

      await prisma.university.delete({
        where: { id },
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

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 获取模板列表
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;

      const where: any = {};

      // 高校用户只能看自己的模板
      if (authReq.user!.role === 'UNIVERSITY') {
        where.universityId = authReq.user!.universityId;
      }

      const templates = await prisma.certificateTemplate.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        include: {
          university: {
            select: { id: true, name: true },
          },
          _count: {
            select: { certificates: true },
          },
        },
      });

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取模板详情
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      const template = await prisma.certificateTemplate.findUnique({
        where: { id },
        include: {
          university: true,
        },
      });

      if (!template) {
        throw new AppError('模板不存在', 404);
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 创建模板
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { name, description, content, fields, universityId } = req.body;

      const finalUniversityId = authReq.user!.role === 'UNIVERSITY' 
        ? authReq.user!.universityId 
        : universityId;

      if (!finalUniversityId) {
        throw new AppError('请选择高校', 400);
      }

      const template = await prisma.certificateTemplate.create({
        data: {
          name,
          description,
          content,
          fields: fields || [],
          universityId: finalUniversityId,
        },
      });

      res.status(201).json({
        success: true,
        message: '模板创建成功',
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 更新模板
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;
      const { name, description, content, fields, isDefault } = req.body;

      const template = await prisma.certificateTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        throw new AppError('模板不存在', 404);
      }

      // 检查权限
      if (
        authReq.user!.role === 'UNIVERSITY' &&
        template.universityId !== authReq.user!.universityId
      ) {
        throw new AppError('无权修改其他高校的模板', 403);
      }

      // 如果设置为默认，取消其他默认模板
      if (isDefault) {
        await prisma.certificateTemplate.updateMany({
          where: {
            universityId: template.universityId,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      const updated = await prisma.certificateTemplate.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(content && { content }),
          ...(fields && { fields }),
          ...(typeof isDefault === 'boolean' && { isDefault }),
        },
      });

      res.json({
        success: true,
        message: '模板更新成功',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除模板
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      const template = await prisma.certificateTemplate.findUnique({
        where: { id },
        include: {
          _count: { select: { certificates: true } },
        },
      });

      if (!template) {
        throw new AppError('模板不存在', 404);
      }

      if (
        authReq.user!.role === 'UNIVERSITY' &&
        template.universityId !== authReq.user!.universityId
      ) {
        throw new AppError('无权删除其他高校的模板', 403);
      }

      if (template._count.certificates > 0) {
        throw new AppError('该模板已被使用，无法删除', 400);
      }

      await prisma.certificateTemplate.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: '模板已删除',
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取默认模板
router.get(
  '/university/:universityId/default',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { universityId } = req.params;

      const template = await prisma.certificateTemplate.findFirst({
        where: {
          universityId,
          isDefault: true,
        },
      });

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

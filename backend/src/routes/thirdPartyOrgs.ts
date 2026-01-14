import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 获取第三方机构列表
router.get(
    '/',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { page = 1, limit = 10, search } = req.query;

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

            // @ts-ignore
            const [orgs, total] = await Promise.all([
                prisma.thirdPartyOrg.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { name: 'asc' },
                }),
                // @ts-ignore
                prisma.thirdPartyOrg.count({ where }),
            ]);

            res.json({
                success: true,
                data: {
                    orgs,
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

// 获取第三方机构详情
router.get(
    '/:id',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { id } = req.params;

            // @ts-ignore
            const org = await prisma.thirdPartyOrg.findUnique({
                where: { id },
            });

            if (!org) {
                throw new AppError('第三方机构不存在', 404);
            }

            res.json({
                success: true,
                data: org,
            });
        } catch (error) {
            next(error);
        }
    }
);

// 创建第三方机构
router.post(
    '/',
    authenticate,
    authorize('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { code, name, type, website } = req.body;

            // @ts-ignore
            const org = await prisma.thirdPartyOrg.create({
                data: {
                    code,
                    name,
                    type: type || 'OTHER',
                    website,
                    isVerified: true,
                },
            });

            res.status(201).json({
                success: true,
                message: '第三方机构创建成功',
                data: org,
            });
        } catch (error) {
            next(error);
        }
    }
);

// 更新第三方机构
router.put(
    '/:id',
    authenticate,
    authorize('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { id } = req.params;
            const { name, type, website } = req.body;

            // @ts-ignore
            const org = await prisma.thirdPartyOrg.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(type && { type }),
                    ...(website && { website }),
                },
            });

            res.json({
                success: true,
                message: '第三方机构更新成功',
                data: org,
            });
        } catch (error) {
            next(error);
        }
    }
);

// 删除第三方机构
router.delete(
    '/:id',
    authenticate,
    authorize('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { id } = req.params;

            // 检查是否有关联用户
            const count = await prisma.user.count({
                where: { thirdPartyOrgId: id },
            });

            if (count > 0) {
                throw new AppError('该机构存在关联用户，无法删除', 400);
            }

            // @ts-ignore
            await prisma.thirdPartyOrg.delete({
                where: { id },
            });

            res.json({
                success: true,
                message: '第三方机构已删除',
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;

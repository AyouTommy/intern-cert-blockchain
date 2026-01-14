import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 获取当前用户的通知列表
router.get(
    '/',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const userId = authReq.user!.id;

            const { page = '1', limit = '20', unreadOnly = 'false' } = req.query;
            const pageNum = parseInt(page as string);
            const limitNum = parseInt(limit as string);

            const where: any = { userId };
            if (unreadOnly === 'true') {
                where.isRead = false;
            }

            const [notifications, total] = await Promise.all([
                prisma.notification.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip: (pageNum - 1) * limitNum,
                    take: limitNum,
                }),
                prisma.notification.count({ where }),
            ]);

            res.json({
                success: true,
                data: {
                    notifications,
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

// 获取未读通知数量
router.get(
    '/unread-count',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const userId = authReq.user!.id;

            const count = await prisma.notification.count({
                where: { userId, isRead: false },
            });

            res.json({
                success: true,
                data: { count },
            });
        } catch (error) {
            next(error);
        }
    }
);

// 标记单个通知为已读
router.patch(
    '/:id/read',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const userId = authReq.user!.id;
            const { id } = req.params;

            const notification = await prisma.notification.findUnique({
                where: { id },
            });

            if (!notification || notification.userId !== userId) {
                throw new AppError('通知不存在', 404);
            }

            await prisma.notification.update({
                where: { id },
                data: { isRead: true },
            });

            res.json({
                success: true,
                message: '已标记为已读',
            });
        } catch (error) {
            next(error);
        }
    }
);

// 标记所有通知为已读
router.patch(
    '/read-all',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const userId = authReq.user!.id;

            await prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true },
            });

            res.json({
                success: true,
                message: '已全部标记为已读',
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;

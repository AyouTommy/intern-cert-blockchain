import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 获取高校管理员列表
router.get(
    '/university/:universityId',
    authenticate,
    authorize('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { universityId } = req.params;

            const admins = await prisma.user.findMany({
                where: {
                    universityId,
                    role: 'UNIVERSITY',
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    isActive: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            res.json({
                success: true,
                data: { admins },
            });
        } catch (error) {
            next(error);
        }
    }
);

// 获取企业管理员列表
router.get(
    '/company/:companyId',
    authenticate,
    authorize('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { companyId } = req.params;

            const admins = await prisma.user.findMany({
                where: {
                    companyId,
                    role: 'COMPANY',
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    isActive: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            res.json({
                success: true,
                data: { admins },
            });
        } catch (error) {
            next(error);
        }
    }
);

// 获取第三方机构管理员列表
router.get(
    '/third-party/:orgId',
    authenticate,
    authorize('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { orgId } = req.params;

            const admins = await prisma.user.findMany({
                where: {
                    thirdPartyOrgId: orgId,
                    role: 'THIRD_PARTY',
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    isActive: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            res.json({
                success: true,
                data: { admins },
            });
        } catch (error) {
            next(error);
        }
    }
);

// 创建机构管理员
router.post(
    '/',
    authenticate,
    authorize('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { email, password, name, phone, orgType, orgId } = req.body;

            // 验证必填字段
            if (!email || !password || !name || !orgType || !orgId) {
                throw new AppError('请填写所有必填字段', 400);
            }

            // 检查邮箱是否已存在
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                throw new AppError('该邮箱已被注册', 400);
            }

            // 确定角色和关联字段
            let role: string;
            let universityId: string | null = null;
            let companyId: string | null = null;
            let thirdPartyOrgId: string | null = null;

            switch (orgType) {
                case 'university':
                    role = 'UNIVERSITY';
                    universityId = orgId;
                    break;
                case 'company':
                    role = 'COMPANY';
                    companyId = orgId;
                    break;
                case 'thirdParty':
                    role = 'THIRD_PARTY';
                    thirdPartyOrgId = orgId;
                    break;
                default:
                    throw new AppError('无效的机构类型', 400);
            }

            const hashedPassword = await bcrypt.hash(password, 12);

            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    phone,
                    role,
                    universityId,
                    companyId,
                    thirdPartyOrgId,
                    isActive: true,
                    approvalStatus: 'APPROVED',
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    isActive: true,
                    createdAt: true,
                },
            });

            // 发送通知给新管理员
            await prisma.notification.create({
                data: {
                    userId: user.id,
                    title: '账户创建成功',
                    content: `您的管理员账户已由系统管理员创建。请使用邮箱 ${email} 和设置的密码登录系统。`,
                    type: 'SYSTEM',
                },
            });

            res.status(201).json({
                success: true,
                message: '管理员创建成功',
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }
);

// 禁用/启用管理员
router.patch(
    '/:userId/toggle-status',
    authenticate,
    authorize('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { userId } = req.params;

            // 不允许禁用自己
            if (userId === authReq.user!.id) {
                throw new AppError('不能禁用自己的账户', 400);
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { isActive: true, name: true },
            });

            if (!user) {
                throw new AppError('用户不存在', 404);
            }

            await prisma.user.update({
                where: { id: userId },
                data: { isActive: !user.isActive },
            });

            res.json({
                success: true,
                message: user.isActive ? '管理员已禁用' : '管理员已启用',
            });
        } catch (error) {
            next(error);
        }
    }
);

// 重置管理员密码
router.patch(
    '/:userId/reset-password',
    authenticate,
    authorize('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { userId } = req.params;
            const { password } = req.body;

            if (!password || password.length < 6) {
                throw new AppError('密码至少需要6个字符', 400);
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new AppError('用户不存在', 404);
            }

            const hashedPassword = await bcrypt.hash(password, 12);

            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword },
            });

            // 发送通知
            await prisma.notification.create({
                data: {
                    userId,
                    title: '密码已重置',
                    content: '您的密码已被系统管理员重置，请使用新密码登录。',
                    type: 'SYSTEM',
                },
            });

            res.json({
                success: true,
                message: '密码已重置',
            });
        } catch (error) {
            next(error);
        }
    }
);

// 删除管理员
router.delete(
    '/:userId',
    authenticate,
    authorize('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { userId } = req.params;

            // 不允许删除自己
            if (userId === authReq.user!.id) {
                throw new AppError('不能删除自己的账户', 400);
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { studentProfile: true },
            });

            if (!user) {
                throw new AppError('用户不存在', 404);
            }

            // 检查是否有关联证书
            const certificateCount = await prisma.certificate.count({
                where: { issuerId: userId },
            });

            if (certificateCount > 0) {
                throw new AppError('该管理员有签发的证书，无法删除。建议禁用该账户。', 400);
            }

            // 删除关联数据
            await prisma.notification.deleteMany({ where: { userId } });
            await prisma.auditLog.deleteMany({ where: { userId } });
            await prisma.passwordResetRequest.deleteMany({ where: { userId } });

            // 删除用户
            await prisma.user.delete({ where: { id: userId } });

            res.json({
                success: true,
                message: '管理员已删除',
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 获取学生列表 - 必须在 /:id 之前定义
router.get(
  '/students/list',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { search } = req.query;

      const where: any = {};

      if (search) {
        where.OR = [
          { studentId: { contains: search as string } },
          { user: { name: { contains: search as string } } },
        ];
      }

      const students = await prisma.studentProfile.findMany({
        where,
        take: 20,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.json({
        success: true,
        data: students,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取用户列表（管理员）
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { page = 1, limit = 10, role, search } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (role) {
        where.role = role;
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string } },
          { email: { contains: search as string } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            avatar: true,
            isActive: true,
            createdAt: true,
            university: { select: { id: true, name: true } },
            company: { select: { id: true, name: true } },
            studentProfile: { select: { studentId: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          users,
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

// 获取用户详情
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          avatar: true,
          walletAddress: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          university: true,
          company: true,
          studentProfile: true,
        },
      });

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 创建用户（管理员）
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { email, password, name, role, phone, universityId, companyId, studentId } = req.body;

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          phone,
          universityId,
          companyId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      if (role === 'STUDENT' && studentId) {
        await prisma.studentProfile.create({
          data: {
            studentId,
            userId: user.id,
          },
        });
      }

      res.status(201).json({
        success: true,
        message: '用户创建成功',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 更新用户
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;
      const { name, phone, role, isActive, universityId, companyId } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(phone && { phone }),
          ...(role && { role }),
          ...(typeof isActive === 'boolean' && { isActive }),
          ...(universityId !== undefined && { universityId }),
          ...(companyId !== undefined && { companyId }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });

      res.json({
        success: true,
        message: '用户更新成功',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 禁用/启用用户
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: { isActive: true },
      });

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive },
      });

      res.json({
        success: true,
        message: user.isActive ? '用户已禁用' : '用户已启用',
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取待审核用户列表
router.get(
  '/pending-approvals/list',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;

      const pendingUsers = await prisma.user.findMany({
        where: {
          approvalStatus: 'PENDING',
          role: { in: ['UNIVERSITY', 'COMPANY', 'THIRD_PARTY'] },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          approvalStatus: true,
          applyOrgName: true,
          applyOrgType: true,
          applyOrgCode: true,
          applyReason: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        data: { users: pendingUsers },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 简化的待审批列表端点（兼容前端调用）
router.get(
  '/pending',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;

      const pendingUsers = await prisma.user.findMany({
        where: {
          approvalStatus: 'PENDING',
          role: { in: ['UNIVERSITY', 'COMPANY', 'THIRD_PARTY'] },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          approvalStatus: true,
          applyOrgName: true,
          applyOrgType: true,
          applyOrgCode: true,
          applyReason: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        data: { users: pendingUsers },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 重置用户密码（管理员）
router.patch(
  '/:id/reset-password',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;
      const { password } = req.body;

      if (!password || password.length < 6) {
        throw new AppError('密码至少需要6个字符', 400);
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
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

// 审批用户注册（统一端点）
router.patch(
  '/:id/approval',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;
      const { approved, rejectReason } = req.body;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      if (user.approvalStatus !== 'PENDING') {
        throw new AppError('该用户不在待审核状态', 400);
      }

      if (approved) {
        // 审核通过
        let universityId = null;
        let companyId = null;
        let thirdPartyOrgId = null;

        // 如果需要创建机构
        if (user.applyOrgName && user.applyOrgCode) {
          if (user.role === 'UNIVERSITY') {
            let university = await prisma.university.findUnique({
              where: { code: user.applyOrgCode },
            });
            if (!university) {
              university = await prisma.university.create({
                data: {
                  code: user.applyOrgCode,
                  name: user.applyOrgName,
                  isVerified: true,
                },
              });
            }
            universityId = university.id;
          } else if (user.role === 'COMPANY') {
            let company = await prisma.company.findUnique({
              where: { code: user.applyOrgCode },
            });
            if (!company) {
              company = await prisma.company.create({
                data: {
                  code: user.applyOrgCode,
                  name: user.applyOrgName,
                  isVerified: true,
                },
              });
            }
            companyId = company.id;
          } else if (user.role === 'THIRD_PARTY') {
            // 创建第三方机构
            // @ts-ignore - ThirdPartyOrg will be available after prisma generate
            const thirdPartyOrg = await prisma.thirdPartyOrg.create({
              data: {
                code: user.applyOrgCode,
                name: user.applyOrgName,
                type: 'HR', // 默认类型
                isVerified: true,
              },
            });
            thirdPartyOrgId = thirdPartyOrg.id;
          }
        }

        await prisma.user.update({
          where: { id },
          data: {
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: authReq.user!.id,
            isActive: true,
            universityId,
            companyId,
            thirdPartyOrgId,
          },
        });

        await prisma.notification.create({
          data: {
            userId: id,
            title: '账户审核通过',
            content: `您的账户申请已通过审核，现在可以正常使用系统功能。`,
            type: 'APPROVAL',
          },
        });

        res.json({
          success: true,
          message: '审核已通过',
        });
      } else {
        await prisma.user.update({
          where: { id },
          data: {
            approvalStatus: 'REJECTED',
            rejectReason: rejectReason || '不符合条件',
            isActive: false,
          },
        });

        await prisma.notification.create({
          data: {
            userId: id,
            title: '账户审核未通过',
            content: `您的申请未通过审核。原因：${rejectReason || '不符合条件'}`,
            type: 'APPROVAL',
          },
        });

        res.json({
          success: true,
          message: '已拒绝该申请',
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// 审核用户申请
router.post(
  '/:id/approve',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;
      const { approved, rejectReason, createOrg = true } = req.body;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      if (user.approvalStatus !== 'PENDING') {
        throw new AppError('该用户不在待审核状态', 400);
      }

      if (approved) {
        // 审核通过
        let universityId = null;
        let companyId = null;

        // 如果需要创建机构
        if (createOrg && user.applyOrgName && user.applyOrgCode) {
          if (user.applyOrgType === 'UNIVERSITY') {
            // 检查高校是否已存在
            let university = await prisma.university.findUnique({
              where: { code: user.applyOrgCode },
            });

            if (!university) {
              // 创建新高校
              university = await prisma.university.create({
                data: {
                  code: user.applyOrgCode,
                  name: user.applyOrgName,
                  isVerified: true,
                },
              });
            }
            universityId = university.id;
          } else if (user.applyOrgType === 'COMPANY') {
            // 检查企业是否已存在
            let company = await prisma.company.findUnique({
              where: { code: user.applyOrgCode },
            });

            if (!company) {
              // 创建新企业
              company = await prisma.company.create({
                data: {
                  code: user.applyOrgCode,
                  name: user.applyOrgName,
                  isVerified: true,
                },
              });
            }
            companyId = company.id;
          }
        }

        await prisma.user.update({
          where: { id },
          data: {
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: authReq.user!.id,
            isActive: true,
            universityId,
            companyId,
          },
        });

        // 发送通知
        await prisma.notification.create({
          data: {
            userId: id,
            title: '账户审核通过',
            content: `您的${user.applyOrgType === 'UNIVERSITY' ? '高校' : '企业'}管理员申请已通过审核，现在可以正常使用系统功能。`,
            type: 'APPROVAL',
          },
        });

        res.json({
          success: true,
          message: '审核已通过',
        });
      } else {
        // 审核拒绝
        await prisma.user.update({
          where: { id },
          data: {
            approvalStatus: 'REJECTED',
            rejectReason,
            isActive: false,
          },
        });

        // 发送通知
        await prisma.notification.create({
          data: {
            userId: id,
            title: '账户审核未通过',
            content: `您的申请未通过审核。原因：${rejectReason || '不符合条件'}`,
            type: 'APPROVAL',
          },
        });

        res.json({
          success: true,
          message: '已拒绝该申请',
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;

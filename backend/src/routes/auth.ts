import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 注册
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('请输入有效的邮箱'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6个字符'),
    body('name').notEmpty().withMessage('请输入姓名'),
    body('role').isIn(['STUDENT', 'UNIVERSITY', 'COMPANY']).withMessage('无效的角色'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const prisma = (req as any).prisma as PrismaClient;
      const { 
        email, password, name, role, 
        studentId, universityId, companyId,
        // 机构申请信息
        applyOrgName, applyOrgCode, applyReason 
      } = req.body;

      // 检查邮箱是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new AppError('邮箱已被注册', 409);
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 12);

      // 创建用户
      const userData: any = {
        email,
        password: hashedPassword,
        name,
        role: role,
      };

      // 根据角色处理不同的注册流程
      if (role === 'STUDENT') {
        // 学生直接激活
        userData.approvalStatus = 'APPROVED';
        userData.isActive = true;
      } else if (role === 'UNIVERSITY' || role === 'COMPANY') {
        // 高校/企业用户需要审核
        if (!applyOrgName || !applyOrgCode) {
          throw new AppError('请填写机构名称和代码', 400);
        }
        
        userData.approvalStatus = 'PENDING';
        userData.isActive = false; // 待审核时不可登录
        userData.applyOrgName = applyOrgName;
        userData.applyOrgType = role;
        userData.applyOrgCode = applyOrgCode;
        userData.applyReason = applyReason;
      }

      // 如果选择了现有机构（管理员审核时可能会关联）
      if (role === 'UNIVERSITY' && universityId) {
        userData.universityId = universityId;
      }
      if (role === 'COMPANY' && companyId) {
        userData.companyId = companyId;
      }

      const user = await prisma.user.create({
        data: userData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          approvalStatus: true,
          createdAt: true,
        },
      });

      // 如果是学生，创建学生档案
      if (role === 'STUDENT' && studentId) {
        await prisma.studentProfile.create({
          data: {
            studentId,
            userId: user.id,
          },
        });
      }

      // 高校/企业用户需要等待审核，不返回token
      if (role === 'UNIVERSITY' || role === 'COMPANY') {
        // 通知管理员有新的审核申请
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true },
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: '新的机构用户申请',
              content: `${name} 申请成为 ${applyOrgName} 的管理员，请前往审核。`,
              type: 'APPROVAL_REQUEST',
            },
          });
        }

        return res.status(201).json({
          success: true,
          message: '注册申请已提交，请等待管理员审核',
          data: {
            user,
            pendingApproval: true,
          },
        });
      }

      // 学生直接生成JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 登录
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('请输入有效的邮箱'),
    body('password').notEmpty().withMessage('请输入密码'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const prisma = (req as any).prisma as PrismaClient;
      const { email, password } = req.body;

      // 查找用户
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          studentProfile: true,
          university: {
            select: { id: true, code: true, name: true },
          },
          company: {
            select: { id: true, code: true, name: true },
          },
        },
      });

      if (!user) {
        throw new AppError('邮箱或密码错误', 401);
      }

      // 检查审核状态
      if (user.approvalStatus === 'PENDING') {
        throw new AppError('您的账户正在等待审核，请耐心等待', 403);
      }

      if (user.approvalStatus === 'REJECTED') {
        throw new AppError(`您的账户申请已被拒绝。原因：${user.rejectReason || '不符合条件'}`, 403);
      }

      if (!user.isActive) {
        throw new AppError('账户已被禁用', 403);
      }

      // 验证密码
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new AppError('邮箱或密码错误', 401);
      }

      // 生成JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          universityId: user.universityId,
          companyId: user.companyId,
        },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '7d' }
      );

      // 记录登录日志
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entityType: 'User',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            studentProfile: user.studentProfile,
            university: user.university,
            company: user.company,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取当前用户信息
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;

      const user = await prisma.user.findUnique({
        where: { id: authReq.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          phone: true,
          walletAddress: true,
          createdAt: true,
          studentProfile: true,
          university: {
            select: { id: true, code: true, name: true, logo: true },
          },
          company: {
            select: { id: true, code: true, name: true, logo: true },
          },
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

// 更新个人信息
router.put(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { name, phone, avatar, walletAddress } = req.body;

      const user = await prisma.user.update({
        where: { id: authReq.user!.id },
        data: {
          ...(name && { name }),
          ...(phone && { phone }),
          ...(avatar && { avatar }),
          ...(walletAddress && { walletAddress }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          phone: true,
          walletAddress: true,
        },
      });

      res.json({
        success: true,
        message: '更新成功',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 修改密码
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('请输入当前密码'),
    body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6个字符'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: authReq.user!.id },
      });

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new AppError('当前密码错误', 400);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      res.json({
        success: true,
        message: '密码修改成功',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

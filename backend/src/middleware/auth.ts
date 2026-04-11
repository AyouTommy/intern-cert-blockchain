import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// ==========================================
//! 【核心中间件】认证与授权
// 每个业务接口都会先过这两个中间件:
//   authenticate → 验证用户是否登录（检查令牌）
//   authorize    → 验证用户角色是否有权操作
// ==========================================

// 系统支持4种角色: 管理员, 高校, 企业, 学生
export type Role = 'ADMIN' | 'UNIVERSITY' | 'COMPANY' | 'STUDENT';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    universityId?: string;
    companyId?: string;
  };
  prisma: PrismaClient;
}

//! 【认证中间件】验证用户是否登录
// 做3件事: ①从请求头取出令牌 ②解码令牌获取用户信息 ③查数据库确认用户存在且未被禁用
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
      });
    }

    // 第1步: 从请求头取出令牌，格式为 "Bearer 令牌字符串"
    const token = authHeader.split(' ')[1];
    // 第2步: 用密钥解码令牌，获取用户ID、角色等信息
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as {
      id: string;
      email: string;
      role: Role;
      universityId?: string;
      companyId?: string;
    };

    // 第3步: 查数据库确认用户存在且未被禁用
    const prisma = (req as any).prisma as PrismaClient;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        universityId: true,
        companyId: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用',
      });
    }

    (req as AuthRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      universityId: user.universityId || undefined,
      companyId: user.companyId || undefined,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期',
      });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌',
      });
    }
    next(error);
  }
};

//! 【授权中间件】验证用户角色是否有权访问
// 例如: authorize('学生') 只允许学生访问
// 例如: authorize('高校', '管理员') 允许高校和管理员访问
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        message: '未认证',
      });
    }

    if (!roles.includes(authReq.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足',
      });
    }

    next();
  };
};

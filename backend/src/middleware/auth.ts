import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// Define Role type matching the values used in the database
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

    const token = authHeader.split(' ')[1];
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

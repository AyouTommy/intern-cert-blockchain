import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult, param, query } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 获取白名单列表
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { page = 1, limit = 20, search, universityId, isUsed, batchId } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      // 构建查询条件
      const where: any = {};

      if (search) {
        where.OR = [
          { studentId: { contains: search as string, mode: 'insensitive' } },
          { name: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (universityId) {
        where.universityId = universityId as string;
      }

      if (isUsed !== undefined) {
        where.isUsed = isUsed === 'true';
      }

      if (batchId) {
        where.batchId = batchId as string;
      }

      const [whitelist, total] = await Promise.all([
        prisma.studentWhitelist.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            university: {
              select: { id: true, code: true, name: true },
            },
          },
        }),
        prisma.studentWhitelist.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          whitelist,
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

// 添加单个学生到白名单
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('studentId').notEmpty().withMessage('请输入学号'),
    body('name').notEmpty().withMessage('请输入姓名'),
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
      const { studentId, name, major, department, enrollmentYear, graduationYear, universityId, idCard } = req.body;

      // 检查学号是否已存在
      const existingStudent = await prisma.studentWhitelist.findUnique({
        where: { studentId },
      });

      if (existingStudent) {
        throw new AppError('该学号已存在于白名单中', 409);
      }

      // 创建白名单记录
      const whitelistEntry = await prisma.studentWhitelist.create({
        data: {
          studentId,
          name,
          major,
          department,
          enrollmentYear: enrollmentYear ? Number(enrollmentYear) : null,
          graduationYear: graduationYear ? Number(graduationYear) : null,
          universityId,
          idCard,
          uploadedBy: authReq.user!.id,
        },
        include: {
          university: {
            select: { id: true, code: true, name: true },
          },
        },
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'ADD_WHITELIST',
          entityType: 'StudentWhitelist',
          entityId: whitelistEntry.id,
          newValue: JSON.stringify({ studentId, name }),
        },
      });

      res.status(201).json({
        success: true,
        message: '学生已添加到白名单',
        data: whitelistEntry,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 批量导入学生到白名单
router.post(
  '/batch',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { students, universityId } = req.body;

      if (!Array.isArray(students) || students.length === 0) {
        throw new AppError('请提供学生数据', 400);
      }

      if (students.length > 500) {
        throw new AppError('单次最多导入500条记录', 400);
      }

      const batchId = uuidv4();
      const results = {
        success: 0,
        failed: 0,
        errors: [] as { studentId: string; error: string }[],
      };

      // 批量处理
      for (const student of students) {
        try {
          if (!student.studentId || !student.name) {
            results.failed++;
            results.errors.push({
              studentId: student.studentId || 'unknown',
              error: '缺少学号或姓名',
            });
            continue;
          }

          // 检查是否已存在
          const existing = await prisma.studentWhitelist.findUnique({
            where: { studentId: student.studentId },
          });

          if (existing) {
            results.failed++;
            results.errors.push({
              studentId: student.studentId,
              error: '学号已存在',
            });
            continue;
          }

          await prisma.studentWhitelist.create({
            data: {
              studentId: student.studentId,
              name: student.name,
              major: student.major,
              department: student.department,
              enrollmentYear: student.enrollmentYear ? Number(student.enrollmentYear) : null,
              graduationYear: student.graduationYear ? Number(student.graduationYear) : null,
              universityId,
              uploadedBy: authReq.user!.id,
              batchId,
            },
          });

          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            studentId: student.studentId,
            error: '添加失败',
          });
        }
      }

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'BATCH_ADD_WHITELIST',
          entityType: 'StudentWhitelist',
          newValue: JSON.stringify({
            batchId,
            total: students.length,
            success: results.success,
            failed: results.failed,
          }),
        },
      });

      res.json({
        success: true,
        message: `批量导入完成：成功 ${results.success} 条，失败 ${results.failed} 条`,
        data: {
          batchId,
          ...results,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 检查学号是否在白名单中（公开接口，用于注册验证）
router.get(
  '/check/:studentId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { studentId } = req.params;

      const whitelistEntry = await prisma.studentWhitelist.findUnique({
        where: { studentId },
        select: {
          id: true,
          studentId: true,
          name: true,
          isUsed: true,
          university: {
            select: { id: true, name: true },
          },
        },
      });

      if (!whitelistEntry) {
        return res.json({
          success: true,
          data: {
            exists: false,
            message: '学号不在白名单中',
          },
        });
      }

      if (whitelistEntry.isUsed) {
        return res.json({
          success: true,
          data: {
            exists: true,
            isUsed: true,
            message: '该学号已被注册使用',
          },
        });
      }

      res.json({
        success: true,
        data: {
          exists: true,
          isUsed: false,
          name: whitelistEntry.name,
          university: whitelistEntry.university,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除白名单记录
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      const whitelistEntry = await prisma.studentWhitelist.findUnique({
        where: { id },
      });

      if (!whitelistEntry) {
        throw new AppError('记录不存在', 404);
      }

      if (whitelistEntry.isUsed) {
        throw new AppError('该记录已被使用，无法删除', 400);
      }

      await prisma.studentWhitelist.delete({
        where: { id },
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'DELETE_WHITELIST',
          entityType: 'StudentWhitelist',
          entityId: id,
          oldValue: JSON.stringify({
            studentId: whitelistEntry.studentId,
            name: whitelistEntry.name,
          }),
        },
      });

      res.json({
        success: true,
        message: '已删除',
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除整个批次
router.delete(
  '/batch/:batchId',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { batchId } = req.params;

      // 检查批次中是否有已使用的记录
      const usedCount = await prisma.studentWhitelist.count({
        where: { batchId, isUsed: true },
      });

      if (usedCount > 0) {
        throw new AppError(`该批次中有 ${usedCount} 条记录已被使用，无法删除`, 400);
      }

      const result = await prisma.studentWhitelist.deleteMany({
        where: { batchId, isUsed: false },
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'DELETE_BATCH_WHITELIST',
          entityType: 'StudentWhitelist',
          newValue: JSON.stringify({ batchId, deletedCount: result.count }),
        },
      });

      res.json({
        success: true,
        message: `已删除 ${result.count} 条记录`,
        data: { deletedCount: result.count },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { blockchainService } from '../services/blockchain';
import { config } from '../config';
import { ensureCertificatePdfAttachment } from '../services/certificatePdf';

const router = Router();

// 生成证明编号
function generateCertNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT${year}${month}${random}`;
}

// 生成验证码
function generateVerifyCode(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
}

// 创建证明
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY', 'COMPANY'),
  [
    body('studentProfileId').notEmpty().withMessage('请选择学生'),
    body('universityId').notEmpty().withMessage('请选择高校'),
    body('companyId').notEmpty().withMessage('请选择企业'),
    body('position').notEmpty().withMessage('请输入实习岗位'),
    body('startDate').isISO8601().withMessage('请输入有效的开始日期'),
    body('endDate').isISO8601().withMessage('请输入有效的结束日期'),
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
      const {
        studentProfileId,
        universityId,
        companyId,
        position,
        department,
        startDate,
        endDate,
        description,
        evaluation,
        templateId,
        autoUpchain,
      } = req.body;

      // 验证日期
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        throw new AppError('结束日期必须大于开始日期', 400);
      }

      // 获取学生信息
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: studentProfileId },
        include: { user: true },
      });

      if (!studentProfile) {
        throw new AppError('学生不存在', 404);
      }

      // 生成证明编号和验证码
      const certNumber = generateCertNumber();
      const verifyCode = generateVerifyCode();
      const verifyUrl = `${config.getVerifyBaseUrl()}/${verifyCode}`;

      // 生成二维码
      const qrCode = await QRCode.toDataURL(verifyUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1a1a2e',
          light: '#ffffff',
        },
      });

      // 创建证明
      const certificate = await prisma.certificate.create({
        data: {
          certNumber,
          studentId: studentProfileId,
          universityId,
          companyId,
          issuerId: authReq.user!.id,
          templateId,
          position,
          department,
          startDate: start,
          endDate: end,
          description,
          evaluation,
          status: 'PENDING',
          verifyCode,
          verifyUrl,
          qrCode,
        },
        include: {
          student: {
            include: { user: { select: { name: true, email: true } } },
          },
          university: { select: { id: true, code: true, name: true } },
          company: { select: { id: true, code: true, name: true } },
          issuer: { select: { id: true, name: true, email: true } },
        },
      });

      // 如果需要自动上链
      if (autoUpchain && blockchainService.isContractAvailable()) {
        await processUpchain(prisma, certificate.id);
      }

      // 记录日志
      await prisma.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'CREATE_CERTIFICATE',
          entityType: 'Certificate',
          entityId: certificate.id,
          newValue: JSON.stringify({ certNumber, position, studentId: studentProfile.studentId }),
        },
      });

      res.status(201).json({
        success: true,
        message: '证明创建成功',
        data: certificate,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取证明列表
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { page = 1, limit = 10, status, search } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      // 构建查询条件
      const where: any = {};

      // 根据角色过滤
      if (authReq.user!.role === 'STUDENT') {
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: authReq.user!.id },
        });
        if (studentProfile) {
          where.studentId = studentProfile.id;
        }
      } else if (authReq.user!.role === 'UNIVERSITY') {
        where.universityId = authReq.user!.universityId;
      } else if (authReq.user!.role === 'COMPANY') {
        where.companyId = authReq.user!.companyId;
      }

      if (status) {
        where.status = status as string;
      }

      if (search) {
        where.OR = [
          { certNumber: { contains: search as string } },
          { position: { contains: search as string } },
          { student: { studentId: { contains: search as string } } },
        ];
      }

      const [certificates, total] = await Promise.all([
        prisma.certificate.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              include: { user: { select: { name: true } } },
            },
            university: { select: { id: true, code: true, name: true } },
            company: { select: { id: true, code: true, name: true } },
            issuer: { select: { id: true, name: true } },
          },
        }),
        prisma.certificate.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          certificates,
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

// 获取证明详情
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { id },
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true, avatar: true } },
            },
          },
          university: true,
          company: true,
          issuer: { select: { id: true, name: true, email: true } },
          template: true,
          verifications: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          attachments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!certificate) {
        throw new AppError('证明不存在', 404);
      }

      // 权限检查：学生只能查看自己的证书
      if (authReq.user!.role === 'STUDENT') {
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: authReq.user!.id },
        });
        if (!studentProfile || studentProfile.id !== certificate.studentId) {
          throw new AppError('无权查看此证明', 403);
        }
      } else if (authReq.user!.role === 'COMPANY') {
        if (certificate.companyId !== authReq.user!.companyId) {
          throw new AppError('无权查看此证明', 403);
        }
      } else if (authReq.user!.role === 'UNIVERSITY') {
        if (certificate.universityId !== authReq.user!.universityId) {
          throw new AppError('无权查看此证明', 403);
        }
      }

      res.json({
        success: true,
        data: certificate,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 上链处理函数
async function processUpchain(prisma: PrismaClient, certificateId: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      student: { include: { user: true } },
      university: true,
      company: true,
    },
  });

  if (!certificate) return;

  // 更新状态为处理中
  await prisma.certificate.update({
    where: { id: certificateId },
    data: { status: 'PROCESSING' },
  });

  try {
    // 生成证明哈希
    const certHash = blockchainService.generateCertHash({
      studentId: certificate.student.studentId,
      universityId: certificate.university.code,
      companyId: certificate.company.code,
      position: certificate.position,
      startDate: Math.floor(certificate.startDate.getTime() / 1000),
      endDate: Math.floor(certificate.endDate.getTime() / 1000),
      certNumber: certificate.certNumber,
    });

    // 上链
    const result = await blockchainService.createCertificate({
      certHash,
      studentAddress: certificate.student.user.walletAddress || '0x0000000000000000000000000000000000000000',
      studentId: certificate.student.studentId,
      universityId: certificate.university.code,
      companyId: certificate.company.code,
      startDate: Math.floor(certificate.startDate.getTime() / 1000),
      endDate: Math.floor(certificate.endDate.getTime() / 1000),
    });

    if (result.success) {
      // 更新证明信息
      await prisma.certificate.update({
        where: { id: certificateId },
        data: {
          status: 'ACTIVE',
          certHash,
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          chainId: blockchainService.getChainId(),
          issuedAt: new Date(),
        },
      });

      // 上链成功后生成PDF证书
      try {
        await ensureCertificatePdfAttachment(prisma, certificateId);
        console.log(`PDF certificate generated for: ${certificateId}`);
      } catch (pdfError) {
        console.error('PDF生成失败:', pdfError);
        // PDF生成失败不阻塞主流程
      }
    } else {
      await prisma.certificate.update({
        where: { id: certificateId },
        data: { status: 'FAILED' },
      });
    }
  } catch (error) {
    console.error('上链失败:', error);
    await prisma.certificate.update({
      where: { id: certificateId },
      data: { status: 'FAILED' },
    });
  }
}

// 手动上链
router.post(
  '/:id/upchain',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY', 'COMPANY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { id },
      });

      if (!certificate) {
        throw new AppError('证明不存在', 404);
      }

      if (certificate.status !== 'PENDING' && certificate.status !== 'FAILED') {
        throw new AppError('当前状态不允许上链', 400);
      }

      if (!blockchainService.isContractAvailable()) {
        throw new AppError('区块链服务不可用', 503);
      }

      // 异步处理上链
      processUpchain(prisma, id);

      res.json({
        success: true,
        message: '上链请求已提交',
      });
    } catch (error) {
      next(error);
    }
  }
);

// 批量上链
router.post(
  '/batch-upchain',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError('请选择要上链的证明', 400);
      }

      if (ids.length > 50) {
        throw new AppError('批量上链最多支持50条', 400);
      }

      if (!blockchainService.isContractAvailable()) {
        throw new AppError('区块链服务不可用', 503);
      }

      // 获取待上链的证明
      const certificates = await prisma.certificate.findMany({
        where: {
          id: { in: ids },
          status: { in: ['PENDING', 'FAILED'] },
        },
        include: {
          student: { include: { user: true } },
          university: true,
          company: true,
        },
      });

      if (certificates.length === 0) {
        throw new AppError('没有可上链的证明', 400);
      }

      // 更新状态
      await prisma.certificate.updateMany({
        where: { id: { in: certificates.map(c => c.id) } },
        data: { status: 'PROCESSING' },
      });

      // 准备批量上链数据
      const certHashes: string[] = [];
      const studentAddresses: string[] = [];
      const studentIds: string[] = [];
      const startDates: number[] = [];
      const endDates: number[] = [];

      const universityId = certificates[0].university.code;
      const companyId = certificates[0].company.code;

      for (const cert of certificates) {
        const certHash = blockchainService.generateCertHash({
          studentId: cert.student.studentId,
          universityId: cert.university.code,
          companyId: cert.company.code,
          position: cert.position,
          startDate: Math.floor(cert.startDate.getTime() / 1000),
          endDate: Math.floor(cert.endDate.getTime() / 1000),
          certNumber: cert.certNumber,
        });

        certHashes.push(certHash);
        studentAddresses.push(cert.student.user.walletAddress || '0x0000000000000000000000000000000000000000');
        studentIds.push(cert.student.studentId);
        startDates.push(Math.floor(cert.startDate.getTime() / 1000));
        endDates.push(Math.floor(cert.endDate.getTime() / 1000));
      }

      // 批量上链
      const result = await blockchainService.batchCreateCertificates({
        certHashes,
        studentAddresses,
        studentIds,
        universityId,
        companyId,
        startDates,
        endDates,
      });

      if (result.success) {
        // 更新所有证明
        for (let i = 0; i < certificates.length; i++) {
          await prisma.certificate.update({
            where: { id: certificates[i].id },
            data: {
              status: 'ACTIVE',
              certHash: certHashes[i],
              txHash: result.txHash,
              blockNumber: result.blockNumber,
              chainId: blockchainService.getChainId(),
              issuedAt: new Date(),
            },
          });
        }

        res.json({
          success: true,
          message: `成功上链 ${certificates.length} 条证明`,
          data: {
            count: certificates.length,
            txHash: result.txHash,
            blockNumber: result.blockNumber,
          },
        });
      } else {
        await prisma.certificate.updateMany({
          where: { id: { in: certificates.map(c => c.id) } },
          data: { status: 'FAILED' },
        });

        throw new AppError(result.error || '批量上链失败', 500);
      }
    } catch (error) {
      next(error);
    }
  }
);

// 添加/更新评语（高校或企业管理员）
router.post(
  '/:id/evaluation',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY', 'COMPANY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;
      const { evaluation, description } = req.body;

      const certificate = await prisma.certificate.findUnique({
        where: { id },
        include: { university: true, company: true },
      });

      if (!certificate) {
        throw new AppError('证明不存在', 404);
      }

      // 检查权限 - 只能评价自己机构的证书
      if (authReq.user!.role === 'UNIVERSITY' &&
        certificate.universityId !== authReq.user!.universityId) {
        throw new AppError('无权操作此证明', 403);
      }
      if (authReq.user!.role === 'COMPANY' &&
        certificate.companyId !== authReq.user!.companyId) {
        throw new AppError('无权操作此证明', 403);
      }

      await prisma.certificate.update({
        where: { id },
        data: {
          ...(evaluation && { evaluation }),
          ...(description && { description }),
        },
      });

      // 记录日志
      await prisma.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'UPDATE_EVALUATION',
          entityType: 'Certificate',
          entityId: id,
          newValue: JSON.stringify({ evaluation, description }),
        },
      });

      res.json({
        success: true,
        message: '评语已更新',
      });
    } catch (error) {
      next(error);
    }
  }
);

// 审批证明（高校审批学生实习证明）
router.post(
  '/:id/approve',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;
      const { approved, rejectReason, autoUpchain = false } = req.body;

      const certificate = await prisma.certificate.findUnique({
        where: { id },
      });

      if (!certificate) {
        throw new AppError('证明不存在', 404);
      }

      // 检查权限
      if (authReq.user!.role === 'UNIVERSITY' &&
        certificate.universityId !== authReq.user!.universityId) {
        throw new AppError('无权操作此证明', 403);
      }

      if (certificate.status !== 'PENDING') {
        throw new AppError('只能审批待处理的证明', 400);
      }

      if (approved) {
        // 审批通过
        await prisma.certificate.update({
          where: { id },
          data: { status: 'PROCESSING' },
        });

        // 如果需要自动上链
        if (autoUpchain) {
          await processUpchain(prisma, id);
        }

        res.json({
          success: true,
          message: autoUpchain ? '证明已审批通过并开始上链' : '证明已审批通过',
        });
      } else {
        // 审批拒绝
        await prisma.certificate.update({
          where: { id },
          data: {
            status: 'FAILED',
            revokeReason: rejectReason,
          },
        });

        res.json({
          success: true,
          message: '证明已拒绝',
        });
      }

      // 记录日志
      await prisma.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: approved ? 'APPROVE_CERTIFICATE' : 'REJECT_CERTIFICATE',
          entityType: 'Certificate',
          entityId: id,
          newValue: JSON.stringify({ approved, rejectReason }),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 撤销证明
router.post(
  '/:id/revoke',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;
      const { reason } = req.body;

      const certificate = await prisma.certificate.findUnique({
        where: { id },
      });

      if (!certificate) {
        throw new AppError('证明不存在', 404);
      }

      if (certificate.status !== 'ACTIVE') {
        throw new AppError('只能撤销已上链的证明', 400);
      }

      // 如果已上链，尝试链上撤销
      if (certificate.certHash && blockchainService.isContractAvailable()) {
        const result = await blockchainService.revokeCertificate(
          certificate.certHash,
          reason || '管理员撤销'
        );

        if (!result.success) {
          console.warn('链上撤销失败:', result.error);
        }
      }

      // 更新数据库状态
      await prisma.certificate.update({
        where: { id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokeReason: reason,
          revokedBy: authReq.user!.id,
        },
      });

      // 记录日志
      await prisma.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'REVOKE_CERTIFICATE',
          entityType: 'Certificate',
          entityId: id,
          newValue: JSON.stringify({ reason }),
        },
      });

      res.json({
        success: true,
        message: '证明已撤销',
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除证明（仅限未上链的）
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'UNIVERSITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { id } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { id },
      });

      if (!certificate) {
        throw new AppError('证明不存在', 404);
      }

      if (certificate.status === 'ACTIVE') {
        throw new AppError('已上链的证明不能删除，只能撤销', 400);
      }

      await prisma.certificate.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: '证明已删除',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { blockchainService } from '../services/blockchain';
import { SignatureService } from '../services/signatureService';
import { config } from '../config';
import { generateCertificatePdf } from '../services/certificatePdf';

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
  authorize('UNIVERSITY'),
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
            select: {
              id: true, isValid: true, createdAt: true,
              verifySource: true, verifierName: true,
            },
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

      // 兜底补齐 IPFS：历史证书可能因异步上传失败导致缺失
      if (certificate.status === 'ACTIVE' && !certificate.ipfsHash) {
        try {
          const { uploadToIPFS, isConfigured } = require('../services/ipfsService');
          if (isConfigured()) {
            const { buffer } = await generateCertificatePdf(certificate as any);
            const cid = await uploadToIPFS(buffer, `${certificate.certNumber}.pdf`);

            const updated = await prisma.certificate.update({
              where: { id: certificate.id },
              data: { ipfsHash: cid },
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
                  select: {
                    id: true, isValid: true, createdAt: true,
                    verifySource: true, verifierName: true,
                  },
                },
                attachments: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            });

            return res.json({
              success: true,
              data: updated,
            });
          }
        } catch (ipfsError) {
          console.warn('详情页 IPFS 自动补齐失败:', ipfsError);
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

    // 生成内容哈希（用于链上存储）
    const contentHash = SignatureService.generateContentHash({
      studentId: certificate.student.studentId,
      universityCode: certificate.university.code,
      companyCode: certificate.company.code,
      position: certificate.position,
      department: certificate.department || undefined,
      startDate: Math.floor(certificate.startDate.getTime() / 1000),
      endDate: Math.floor(certificate.endDate.getTime() / 1000),
      evaluation: certificate.evaluation || undefined,
      certNumber: certificate.certNumber,
    });

    //! 【多方确认上链】带自动重试的两步确认流程
    const MAX_RETRIES = 3;
    let lastError = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // 第1步：高校钱包提交请求（使用机构独立密钥）
        const submitResult = await blockchainService.submitCertificateRequest({
          certHash,
          studentId: certificate.student.studentId,
          universityId: certificate.university.code,
          companyId: certificate.company.code,
          startDate: Math.floor(certificate.startDate.getTime() / 1000),
          endDate: Math.floor(certificate.endDate.getTime() / 1000),
          contentHash,
          encryptedPrivKey: certificate.university.encryptedPrivKey || undefined,
        });

        if (!submitResult.success) {
          throw new Error(submitResult.error || '高校提交请求失败');
        }

        // 第2步：企业钱包确认（使用机构独立密钥）
        const confirmResult = await blockchainService.companyConfirmCertificate(
          certHash,
          certificate.company.encryptedPrivKey || undefined
        );

        if (!confirmResult.success) {
          throw new Error(confirmResult.error || '企业确认失败');
        }

        // 上链成功 — 更新数据库
        await prisma.certificate.update({
          where: { id: certificateId },
          data: {
            status: 'ACTIVE',
            certHash,
            txHash: confirmResult.txHash,
            blockNumber: confirmResult.blockNumber,
            chainId: blockchainService.getChainId(),
            issuedAt: new Date(),
            universityAddr: submitResult.universityAddr,
            companyAddr: confirmResult.companyAddr,
            contentHash,
            retryCount: attempt - 1,
            failReason: null,
          },
        });

      // 上链成功后异步上传 IPFS（不阻塞响应）
      (async () => {
        try {
          const { uploadToIPFS, getIPFSUrl, isConfigured } = require('../services/ipfsService');
          if (!isConfigured()) return;

          // 重新查询完整证书数据（包含关联）
          const fullCert = await prisma.certificate.findUnique({
            where: { id: certificateId },
            include: {
              student: { include: { user: true } },
              university: true,
              company: true,
            },
          });
          if (!fullCert) return;

          // 生成 PDF
          const { buffer } = await generateCertificatePdf(fullCert as any);

          // 上传到 IPFS
          const cid = await uploadToIPFS(buffer, `${fullCert.certNumber}.pdf`);

          // 更新数据库
          await prisma.certificate.update({
            where: { id: certificateId },
            data: { ipfsHash: cid },
          });

          console.log(`📦 IPFS 上传成功: ${fullCert.certNumber} → ${cid}`);
          console.log(`🔗 查看: ${getIPFSUrl(cid)}`);
        } catch (err) {
          console.error('⚠️ IPFS 上传失败（不影响核心功能）:', err);
        }
      })();

        // 通知学生上链成功
        await prisma.notification.create({
          data: {
            userId: certificate.student.user.id,
            title: '🎉 实习证明上链成功',
            content: `您的实习证明（${certificate.certNumber}）已成功上链，可前往证书详情查看链上凭证。`,
            type: 'APPLICATION_STATUS',
            link: `/certificates/${certificateId}`,
          },
        });

        // 上链成功，跳出重试循环
        return;
      } catch (retryError: any) {
        lastError = retryError.message;
        console.warn(`⚠️ 上链第 ${attempt} 次尝试失败: ${lastError}`);
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    // 所有重试失败
    await prisma.certificate.update({
      where: { id: certificateId },
      data: { status: 'FAILED', failReason: lastError, retryCount: MAX_RETRIES },
    });

    // 通知学生上链失败
    await prisma.notification.create({
      data: {
        userId: certificate.student.user.id,
        title: '实习证明上链失败',
        content: `您的实习证明（${certificate.certNumber}）上链失败（已重试${MAX_RETRIES}次），管理员将会重新处理。`,
        type: 'SYSTEM',
      },
    });
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
  authorize('UNIVERSITY', 'COMPANY'),
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
  authorize('UNIVERSITY'),
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
  authorize('UNIVERSITY', 'COMPANY'),
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
  authorize('UNIVERSITY'),
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
  authorize('UNIVERSITY'),
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

// 删除证明（管理员可强制删除任何状态的证明）
router.delete(
  '/:id',
  authenticate,
  authorize('UNIVERSITY'),
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

      // 已上链的证明不能直接删除，需先撤销
      if (certificate.status === 'ACTIVE') {
        throw new AppError('已上链的证明不能删除，请先撤销后再删除', 400);
      }

      // 删除关联的核验记录
      await prisma.verification.deleteMany({
        where: { certificateId: id },
      });

      // 解除关联的申请
      await prisma.internshipApplication.updateMany({
        where: { certificateId: id },
        data: { certificateId: null },
      });

      // 删除证明（附件会因为 onDelete: Cascade 自动删除）
      await prisma.certificate.delete({
        where: { id },
      });

      // 记录日志
      await prisma.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'DELETE_CERTIFICATE',
          entityType: 'Certificate',
          entityId: id,
          newValue: JSON.stringify({ certNumber: certificate.certNumber, status: certificate.status }),
        },
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

// 批量删除证明
router.post(
  '/batch-delete',
  authenticate,
  authorize('UNIVERSITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const prisma = authReq.prisma;
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError('请选择要删除的证明', 400);
      }

      if (ids.length > 50) {
        throw new AppError('批量删除最多支持50条', 400);
      }

      // 获取要删除的证明
      const certificates = await prisma.certificate.findMany({
        where: { id: { in: ids } },
      });

      if (certificates.length === 0) {
        throw new AppError('没有找到要删除的证明', 400);
      }

      // 删除关联的核验记录
      await prisma.verification.deleteMany({
        where: { certificateId: { in: ids } },
      });

      // 解除关联的申请
      await prisma.internshipApplication.updateMany({
        where: { certificateId: { in: ids } },
        data: { certificateId: null },
      });

      // 批量删除证明
      const result = await prisma.certificate.deleteMany({
        where: { id: { in: ids } },
      });

      // 记录日志
      await prisma.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'BATCH_DELETE_CERTIFICATES',
          entityType: 'Certificate',
          newValue: JSON.stringify({
            count: result.count,
            certNumbers: certificates.map(c => c.certNumber),
          }),
        },
      });

      res.json({
        success: true,
        message: `成功删除 ${result.count} 条证明`,
        data: { count: result.count },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 动态生成PDF证书（不依赖文件系统，每次请求动态生成）
router.get(
  '/:id/pdf',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { id } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { id },
        include: {
          student: { include: { user: { select: { name: true } } } },
          university: { select: { name: true, code: true, logo: true } },
          company: { select: { name: true, code: true, logo: true } },
        },
      });

      if (!certificate) {
        return res.status(404).json({
          success: false,
          message: '证明不存在',
        });
      }

      // 只允许已上链的证书生成PDF
      if (certificate.status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          message: '只有已上链的证书才能生成PDF',
        });
      }

      // 动态生成PDF
      const { buffer, hash } = await generateCertificatePdf(certificate as any);

      // 检查是否强制下载 (有download参数时使用attachment)
      const forceDownload = req.query.download !== undefined;
      const disposition = forceDownload ? 'attachment' : 'inline';

      // 文件名格式: 学生名字_学号_实习证书.pdf
      const studentName = certificate.student.user.name;
      const studentId = certificate.student.studentId;
      const fileName = `${studentName}_${studentId}_实习证书.pdf`;

      // 设置响应头
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('X-PDF-Hash', hash);

      res.send(buffer);
    } catch (error) {
      console.error('PDF生成失败:', error);
      next(error);
    }
  }
);

export default router;

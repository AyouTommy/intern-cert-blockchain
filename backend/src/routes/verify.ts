import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { blockchainService } from '../services/blockchain';

const router = Router();

// ==========================================
// 【流程第5步】公开核验路由
// 无需登录，任何人扫码即可核验证书真伪
// 支持3种核验方式: 验证码 / 证书编号 / 区块链哈希
// ==========================================

// 脱敏工具函数 — 保护学生隐私

// 姓名脱敏: 保留第一个字，其余用*替代（例: "张三" → "张*"）
function maskName(name: string): string {
  if (!name || name.length <= 1) return name || '*';
  return name[0] + '*'.repeat(name.length - 1);
}

// 学号脱敏: 保留前4位和后2位，中间用*替代（例: "202420611009" → "2024******09"）
function maskStudentId(studentId: string): string {
  if (!studentId || studentId.length <= 6) return studentId ? studentId.substring(0, 2) + '****' : '****';
  const prefix = studentId.substring(0, 4);
  const suffix = studentId.substring(studentId.length - 2);
  const masked = '*'.repeat(studentId.length - 6);
  return `${prefix}${masked}${suffix}`;
}

// 核验方式一: 通过验证码核验（扫二维码时调用）
// 前端 公开核验页面 发请求到 /verify/code/验证码
// 做4件事: ①查数据库 ②链上二次验证 ③脱敏处理 ④记录核验日志
router.get(
  '/code/:code',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { code } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { verifyCode: code },
        include: {
          student: {
            include: {
              user: { select: { name: true } },
            },
          },
          university: {
            select: { code: true, name: true, logo: true },
          },
          company: {
            select: { code: true, name: true, logo: true },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              fileSize: true,
              mimeType: true,
              category: true,
              description: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!certificate) {
        return res.status(404).json({
          success: false,
          isValid: false,
          message: '证明不存在',
        });
      }

      // 检查是否已撤销
      if (certificate.status === 'REVOKED') {
        return res.status(200).json({
          success: true,
          isValid: false,
          message: '该证明已被撤销',
          data: {
            certNumber: certificate.certNumber,
            status: certificate.status,
            revocation: {
              revokedAt: certificate.revokedAt,
              reason: certificate.revokeReason,
            },
          },
        });
      }

      // 【关键】记录核验日志，方便审计追踪
      await prisma.verification.create({
        data: {
          certificateId: certificate.id,
          verifierIp: req.ip,
          verifierAgent: req.get('user-agent'),
          isValid: certificate.status === 'ACTIVE' || certificate.status === 'PENDING',
        },
      });

      // 【关键】链上二次验证: 如果证书已上链，调用智能合约的"验证证书"方法
      // 实现“数据库查一次 + 区块链查一次”的双重保障
      let chainVerification = null;
      if (certificate.certHash && blockchainService.isContractAvailable()) {
        try {
          const chainResult = await blockchainService.verifyCertificate(certificate.certHash);
          chainVerification = {
            isValid: chainResult.isValid,
            onChain: true,
            chainData: chainResult.certificate,
          };
        } catch (error) {
          chainVerification = {
            isValid: false,
            onChain: false,
            error: '链上验证失败',
          };
        }
      }

      // PENDING 和 ACTIVE 状态都视为有效（待上链和已上链）
      const isValid = certificate.status === 'ACTIVE' || certificate.status === 'PENDING';

      // 【关键】返回结果时对学生信息做脱敏处理（隐私保护）
      // 姓名只显示第一个字，学号中间用星号替代
      res.json({
        success: true,
        isValid,
        data: {
          id: certificate.id,
          certNumber: certificate.certNumber,
          status: certificate.status,
          studentName: maskName(certificate.student.user.name),
          studentId: maskStudentId(certificate.student.studentId),
          university: certificate.university,
          company: certificate.company,
          position: certificate.position,
          department: certificate.department,
          startDate: certificate.startDate,
          endDate: certificate.endDate,
          issuedAt: certificate.issuedAt,
          // 公开核验不返回完整评价和描述（隐私保护）
          // 区块链信息
          blockchain: certificate.certHash ? {
            certHash: certificate.certHash,
            txHash: certificate.txHash,
            blockNumber: certificate.blockNumber,
            chainId: certificate.chainId,
            verification: chainVerification,
          } : null,
          // 撤销信息
          revocation: certificate.status === 'REVOKED' ? {
            revokedAt: certificate.revokedAt,
            reason: certificate.revokeReason,
          } : null,
          // 附件基本信息（不含下载链接，保护隐私）
          attachments: certificate.attachments.map(att => ({
            id: att.id,
            name: att.originalName,
            size: att.fileSize,
            type: att.mimeType,
            category: att.category,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 公开验证接口 - 通过证明编号
router.get(
  '/number/:certNumber',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { certNumber } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { certNumber },
        include: {
          student: {
            include: {
              user: { select: { name: true } },
            },
          },
          university: {
            select: { code: true, name: true, logo: true },
          },
          company: {
            select: { code: true, name: true, logo: true },
          },
        },
      });

      if (!certificate) {
        return res.status(404).json({
          success: false,
          isValid: false,
          message: '证明不存在',
        });
      }

      // 记录验证
      await prisma.verification.create({
        data: {
          certificateId: certificate.id,
          verifierIp: req.ip,
          verifierAgent: req.get('user-agent'),
          isValid: certificate.status === 'ACTIVE',
        },
      });

      const isValid = certificate.status === 'ACTIVE';

      // 公开核验使用脱敏数据
      res.json({
        success: true,
        isValid,
        data: {
          certNumber: certificate.certNumber,
          status: certificate.status,
          studentName: maskName(certificate.student.user.name),
          university: certificate.university.name,
          company: certificate.company.name,
          position: certificate.position,
          startDate: certificate.startDate,
          endDate: certificate.endDate,
          issuedAt: certificate.issuedAt,
          hasBlockchain: !!certificate.certHash,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 公开验证接口 - 通过区块链哈希
router.get(
  '/hash/:hash',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { hash } = req.params;

      // 先从数据库查询
      const certificate = await prisma.certificate.findUnique({
        where: { certHash: hash },
        include: {
          student: {
            include: {
              user: { select: { name: true } },
            },
          },
          university: {
            select: { code: true, name: true },
          },
          company: {
            select: { code: true, name: true },
          },
        },
      });

      // 链上验证
      let chainData = null;
      if (blockchainService.isContractAvailable()) {
        try {
          const result = await blockchainService.verifyCertificate(hash);
          chainData = {
            isValid: result.isValid,
            certificate: result.certificate,
          };
        } catch (error) {
          chainData = { isValid: false, error: '链上查询失败' };
        }
      }

      if (!certificate && !chainData?.isValid) {
        return res.status(404).json({
          success: false,
          isValid: false,
          message: '证明不存在',
        });
      }

      // 公开核验使用脱敏数据
      res.json({
        success: true,
        isValid: chainData?.isValid || certificate?.status === 'ACTIVE',
        data: {
          database: certificate ? {
            certNumber: certificate.certNumber,
            status: certificate.status,
            studentName: maskName(certificate.student.user.name),
            university: certificate.university.name,
            company: certificate.company.name,
            position: certificate.position,
            startDate: certificate.startDate,
            endDate: certificate.endDate,
          } : null,
          blockchain: chainData,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取合约信息
router.get(
  '/contract-info',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAvailable = blockchainService.isContractAvailable();
      const address = blockchainService.getContractAddress();

      let networkInfo = null;
      let stats = null;

      if (isAvailable) {
        try {
          networkInfo = await blockchainService.getNetworkInfo();
          const statsResult = await blockchainService.getStatistics();
          if (statsResult.success) {
            stats = statsResult.stats;
          }
        } catch (error) {
          console.error('获取网络信息失败:', error);
        }
      }

      res.json({
        success: true,
        data: {
          available: isAvailable,
          address,
          network: networkInfo,
          statistics: stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

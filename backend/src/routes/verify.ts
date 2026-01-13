import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { blockchainService } from '../services/blockchain';

const router = Router();

// 公开验证接口 - 通过验证码
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

      // 记录验证
      await prisma.verification.create({
        data: {
          certificateId: certificate.id,
          verifierIp: req.ip,
          verifierAgent: req.get('user-agent'),
          isValid: certificate.status === 'ACTIVE' || certificate.status === 'PENDING',
        },
      });

      // 链上验证（如果已上链）
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

      res.json({
        success: true,
        isValid,
        data: {
          certNumber: certificate.certNumber,
          status: certificate.status,
          studentName: certificate.student.user.name,
          studentId: certificate.student.studentId,
          university: certificate.university,
          company: certificate.company,
          position: certificate.position,
          department: certificate.department,
          startDate: certificate.startDate,
          endDate: certificate.endDate,
          issuedAt: certificate.issuedAt,
          description: certificate.description,
          evaluation: certificate.evaluation,
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
          // 附件信息
          attachments: certificate.attachments.map(att => ({
            id: att.id,
            name: att.originalName,
            size: att.fileSize,
            type: att.mimeType,
            category: att.category,
            description: att.description,
            downloadUrl: `/api/attachments/download/${att.id}`,
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

      res.json({
        success: true,
        isValid,
        data: {
          certNumber: certificate.certNumber,
          status: certificate.status,
          studentName: certificate.student.user.name,
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

      res.json({
        success: true,
        isValid: chainData?.isValid || certificate?.status === 'ACTIVE',
        data: {
          database: certificate ? {
            certNumber: certificate.certNumber,
            status: certificate.status,
            studentName: certificate.student.user.name,
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

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { blockchainService } from '../services/blockchain';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// ==========================================
//! 【流程第5步】核验路由（统一架构 v2）
// 支持3种核验方式: 验证码 / 证书编号 / 区块链哈希
// 权限模型: 基于角色+归属关系的智能权限控制
//   - 公开核验（无登录/管理员）: 脱敏信息 + 完整区块链 + 脱敏卡片
//   - 自己的证书: 完整信息 + PDF下载
//   - 第三方机构: 任意证书完整信息 + PDF下载
// ==========================================

// ==================== 脱敏工具函数 ====================

// 姓名脱敏: "张三" → "张*"
function maskName(name: string): string {
  if (!name || name.length <= 1) return name || '*';
  return name[0] + '*'.repeat(name.length - 1);
}

// 学号脱敏: "202420611009" → "2024******09"
function maskStudentId(studentId: string): string {
  if (!studentId || studentId.length <= 6) return studentId ? studentId.substring(0, 2) + '****' : '****';
  const prefix = studentId.substring(0, 4);
  const suffix = studentId.substring(studentId.length - 2);
  const masked = '*'.repeat(studentId.length - 6);
  return `${prefix}${masked}${suffix}`;
}

// ==================== 归属判断 ====================

// 判断用户是否"拥有"这张证书（学生/高校/企业视角）
function checkOwnership(user: any, certificate: any): boolean {
  if (!user) return false;
  switch (user.role) {
    case 'STUDENT':
      return certificate.student?.user?.id === user.id ||
        certificate.student?.userId === user.id;
    case 'UNIVERSITY':
      return certificate.universityId === user.universityId;
    case 'COMPANY':
      return certificate.companyId === user.companyId;
    default:
      return false;
  }
}

// 生成核验人名称
function getVerifierName(user: any): string | null {
  if (!user) return null;
  switch (user.role) {
    case 'UNIVERSITY':
      return `${user.name}(${user.universityName || '高校'})`;
    case 'COMPANY':
      return `${user.name}(${user.companyName || '企业'})`;
    case 'STUDENT':
      return `${user.name}(${user.studentId || '学生'})`;
    case 'THIRD_PARTY':
      return `${user.name}(第三方机构)`;
    case 'ADMIN':
      return null; // 管理员等同公开核验
    default:
      return null;
  }
}

// 获取核验来源标识
function getVerifySource(user: any): string {
  if (!user) return 'PUBLIC';
  if (user.role === 'ADMIN') return 'PUBLIC'; // 管理员等同公开
  return user.role; // STUDENT / UNIVERSITY / COMPANY / THIRD_PARTY
}

// ==================== 统一核验逻辑 ====================

// 证书查询的统一 include 条件
const certificateInclude = {
  student: {
    include: {
      user: { select: { id: true, name: true } },
    },
  },
  university: {
    select: { id: true, code: true, name: true, logo: true },
  },
  company: {
    select: { id: true, code: true, name: true, logo: true },
  },
  attachments: {
    select: {
      id: true, fileName: true, originalName: true,
      fileSize: true, mimeType: true, category: true,
      description: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

// 统一核验处理函数
async function handleVerification(
  req: Request,
  res: Response,
  certificate: any,
) {
  const prisma = (req as any).prisma as PrismaClient;
  const user = (req as any).optionalUser || null;

  // ==== 1. 权限判断 ====
  const isOwner = checkOwnership(user, certificate);
  const isPrivileged = user?.role === 'THIRD_PARTY';
  const fullAccess = isOwner || isPrivileged;

  // ==== 2. 记录核验日志（含来源） ====
  await prisma.verification.create({
    data: {
      certificateId: certificate.id,
      verifierIp: req.ip,
      verifierAgent: req.get('user-agent'),
      isValid: certificate.status === 'ACTIVE' || certificate.status === 'PENDING',
      verifySource: getVerifySource(user),
      verifierName: getVerifierName(user),
      verifierId: user?.id || null,
    },
  });

  // ==== 3. 链上二次验证 ====
  let chainVerification: any = null;
  if (certificate.certHash && blockchainService.isContractAvailable()) {
    try {
      const chainResult = await blockchainService.verifyCertificate(certificate.certHash);
      chainVerification = {
        isValid: chainResult.isValid,
        isExpired: chainResult.isExpired,
        onChain: true,
        chainData: chainResult.certificate,
      };
    } catch {
      chainVerification = {
        isValid: false, isExpired: false, onChain: false,
        error: '链上验证失败',
      };
    }
  }

  // ==== 4. 有效性判定 ====
  const dbIsValid = certificate.status === 'ACTIVE' || certificate.status === 'PENDING';
  const chainIsValid = chainVerification?.isValid ?? null;
  const isValid = chainIsValid !== null ? (dbIsValid && chainIsValid) : dbIsValid;

  // ==== 5. 一致性检查 ====
  const consistencyCheck = chainVerification ? {
    databaseValid: dbIsValid,
    blockchainValid: chainVerification.isValid,
    isExpired: chainVerification.isExpired || false,
    isConsistent: dbIsValid === chainVerification.isValid,
    verificationMethod: 'DATABASE_AND_BLOCKCHAIN',
    message: dbIsValid === chainVerification.isValid
      ? '数据库与区块链验证一致'
      : '⚠️ 数据库与区块链状态不一致，请联系管理员',
  } : {
    databaseValid: dbIsValid,
    blockchainValid: null,
    isExpired: false,
    isConsistent: true,
    verificationMethod: 'DATABASE_ONLY',
    message: certificate.certHash ? '区块链服务暂不可用，仅完成数据库验证' : '证书尚未上链，仅完成数据库验证',
  };

  // ==== 6. 构建响应数据 ====
  const realName = certificate.student?.user?.name || '';
  const realStudentId = certificate.student?.studentId || '';

  const data: any = {
    id: fullAccess ? certificate.id : undefined,
    certNumber: certificate.certNumber,
    status: certificate.status,
    // 实习信息：按权限脱敏
    studentName: fullAccess ? realName : maskName(realName),
    studentId: fullAccess ? realStudentId : maskStudentId(realStudentId),
    university: certificate.university,
    company: certificate.company,
    position: certificate.position,
    department: certificate.department,
    startDate: certificate.startDate,
    endDate: certificate.endDate,
    issuedAt: certificate.issuedAt,
    description: fullAccess ? certificate.description : undefined,
    evaluation: fullAccess ? certificate.evaluation : undefined,
    // 区块链信息：始终完整返回
    blockchain: certificate.certHash ? {
      certHash: certificate.certHash,
      txHash: certificate.txHash,
      blockNumber: certificate.blockNumber,
      chainId: certificate.chainId,
      verification: chainVerification,
    } : null,
    consistencyCheck,
    // 多方确认
    multiPartyConfirmation: (certificate as any).universityAddr ? {
      universityAddr: (certificate as any).universityAddr,
      companyAddr: (certificate as any).companyAddr,
      isConfirmed: !!(certificate as any).universityAddr && !!(certificate as any).companyAddr,
    } : null,
    // 撤销信息
    revocation: certificate.status === 'REVOKED' ? {
      revokedAt: certificate.revokedAt,
      reason: certificate.revokeReason,
    } : null,
    // 附件（仅完整权限）
    attachments: fullAccess ? certificate.attachments?.map((att: any) => ({
      id: att.id,
      name: att.originalName,
      size: att.fileSize,
      type: att.mimeType,
      category: att.category,
    })) : undefined,
    // 权限标识
    accessLevel: fullAccess ? 'full' : 'public',
    canDownloadPdf: fullAccess,
  };

  res.json({
    success: true,
    isValid,
    data,
  });
}

// ==================== 路由定义 ====================

// 核验方式一: 通过验证码（二维码扫描 / 登录后核验）
router.get(
  '/code/:code',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { code } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { verifyCode: code },
        include: certificateInclude,
      });

      if (!certificate) {
        return res.status(404).json({
          success: false, isValid: false, message: '证明不存在',
        });
      }

      if (certificate.status === 'REVOKED') {
        return res.json({
          success: true,
          isValid: false,
          message: '该证明已被撤销',
          data: {
            certNumber: certificate.certNumber,
            status: certificate.status,
            revocation: { revokedAt: certificate.revokedAt, reason: certificate.revokeReason },
          },
        });
      }

      await handleVerification(req, res, certificate);
    } catch (error) {
      next(error);
    }
  }
);

// 核验方式二: 通过证明编号
router.get(
  '/number/:certNumber',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { certNumber } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { certNumber },
        include: certificateInclude,
      });

      if (!certificate) {
        return res.status(404).json({
          success: false, isValid: false, message: '证明不存在',
        });
      }

      if (certificate.status === 'REVOKED') {
        return res.json({
          success: true,
          isValid: false,
          message: '该证明已被撤销',
          data: {
            certNumber: certificate.certNumber,
            status: certificate.status,
            revocation: { revokedAt: certificate.revokedAt, reason: certificate.revokeReason },
          },
        });
      }

      await handleVerification(req, res, certificate);
    } catch (error) {
      next(error);
    }
  }
);

// 核验方式三: 通过区块链哈希
router.get(
  '/hash/:hash',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = (req as any).prisma as PrismaClient;
      const { hash } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { certHash: hash },
        include: certificateInclude,
      });

      if (!certificate) {
        // 链上直接查
        let chainData: any = null;
        if (blockchainService.isContractAvailable()) {
          try {
            const result = await blockchainService.verifyCertificate(hash);
            chainData = result;
          } catch { /* ignore */ }
        }

        if (!chainData?.isValid) {
          return res.status(404).json({
            success: false, isValid: false, message: '证明不存在',
          });
        }

        // 只有链上数据没有数据库记录
        return res.json({
          success: true,
          isValid: true,
          data: {
            blockchain: { certHash: hash, verification: chainData },
            accessLevel: 'public',
            canDownloadPdf: false,
          },
        });
      }

      await handleVerification(req, res, certificate);
    } catch (error) {
      next(error);
    }
  }
);

// 获取合约信息（公开）
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

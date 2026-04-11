import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { blockchainService } from '../services/blockchain';
import { config } from '../config';

const router = Router();

// 生成申请编号
function generateApplicationNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `APP${year}${month}${day}${random}`;
}

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

// 获取申请列表
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

            // 根据角色构建查询条件
            const where: any = {};

            if (authReq.user!.role === 'STUDENT') {
                // 学生只能看自己的申请
                const studentProfile = await prisma.studentProfile.findUnique({
                    where: { userId: authReq.user!.id },
                });
                if (studentProfile) {
                    where.studentId = studentProfile.id;
                } else {
                    return res.json({
                        success: true,
                        data: { applications: [], pagination: { page: 1, limit: limitNum, total: 0, totalPages: 0 } },
                    });
                }
            } else if (authReq.user!.role === 'COMPANY') {
                // 企业只能看提交给自己的申请
                where.companyId = authReq.user!.companyId;
                // 企业只能看到已提交及之后状态的申请
                where.status = { not: 'DRAFT' };
            } else if (authReq.user!.role === 'UNIVERSITY') {
                // 高校只能看本校学生的申请，且需要企业已签章
                where.universityId = authReq.user!.universityId;
                where.status = { in: ['COMPANY_APPROVED', 'UNIVERSITY_REVIEWING', 'APPROVED', 'REJECTED'] };
            }
            // ADMIN 可以看所有申请

            if (status) {
                where.status = status as string;
            }

            if (search) {
                where.OR = [
                    { applicationNo: { contains: search as string, mode: 'insensitive' } },
                    { position: { contains: search as string, mode: 'insensitive' } },
                ];
            }

            const [applications, total] = await Promise.all([
                prisma.internshipApplication.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        student: {
                            include: { user: { select: { name: true, email: true } } },
                        },
                        university: { select: { id: true, code: true, name: true } },
                        company: { select: { id: true, code: true, name: true } },
                        certificate: { select: { id: true, certNumber: true, status: true } },
                    },
                }),
                prisma.internshipApplication.count({ where }),
            ]);

            res.json({
                success: true,
                data: {
                    applications,
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

// ==========================================
// 【流程第1步】学生创建申请
// 前端 ApplicationsPage 调POST /applications
// 中间件: authenticate(验证登录) → authorize(验证角色=学生)
// 创建后状态为 DRAFT(草稿)，需要再调 submit 接口才正式提交
// ==========================================
router.post(
    '/',
    authenticate,
    authorize('STUDENT'),
    [
        body('companyId').notEmpty().withMessage('请选择实习企业'),
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
            const { companyId, position, department, startDate, endDate, description } = req.body;

            // 获取学生档案
            const studentProfile = await prisma.studentProfile.findUnique({
                where: { userId: authReq.user!.id },
                include: { user: true },
            });

            if (!studentProfile) {
                throw new AppError('未找到学生档案', 404);
            }

            // 验证企业存在
            const company = await prisma.company.findUnique({
                where: { id: companyId },
            });

            if (!company) {
                throw new AppError('企业不存在', 404);
            }

            // 获取学生所属高校（从白名单获取或默认第一个高校）
            let universityId: string | null = null;

            const whitelist = await prisma.studentWhitelist.findUnique({
                where: { studentId: studentProfile.studentId },
            });

            if (whitelist?.universityId) {
                universityId = whitelist.universityId;
            } else {
                // 如果白名单没有高校信息，获取默认高校
                const defaultUniversity = await prisma.university.findFirst();
                if (defaultUniversity) {
                    universityId = defaultUniversity.id;
                } else {
                    throw new AppError('系统中没有可用的高校', 400);
                }
            }

            // 验证日期
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (start >= end) {
                throw new AppError('结束日期必须大于开始日期', 400);
            }

            // 创建申请
            const application = await prisma.internshipApplication.create({
                data: {
                    applicationNo: generateApplicationNo(),
                    studentId: studentProfile.id,
                    universityId,
                    companyId,
                    position,
                    department,
                    startDate: start,
                    endDate: end,
                    description,
                    status: 'DRAFT',
                },
                include: {
                    student: {
                        include: { user: { select: { name: true, email: true } } },
                    },
                    university: { select: { id: true, code: true, name: true } },
                    company: { select: { id: true, code: true, name: true } },
                },
            });

            // 记录日志
            await prisma.auditLog.create({
                data: {
                    userId: authReq.user!.id,
                    action: 'CREATE_APPLICATION',
                    entityType: 'InternshipApplication',
                    entityId: application.id,
                    newValue: JSON.stringify({ applicationNo: application.applicationNo, position }),
                },
            });

            res.status(201).json({
                success: true,
                message: '申请已创建',
                data: application,
            });
        } catch (error) {
            next(error);
        }
    }
);

// 获取申请详情
router.get(
    '/:id',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { id } = req.params;

            const application = await prisma.internshipApplication.findUnique({
                where: { id },
                include: {
                    student: {
                        include: { user: { select: { name: true, email: true, avatar: true } } },
                    },
                    university: true,
                    company: true,
                    certificate: true,
                },
            });

            if (!application) {
                throw new AppError('申请不存在', 404);
            }

            // 权限检查
            if (authReq.user!.role === 'STUDENT') {
                const studentProfile = await prisma.studentProfile.findUnique({
                    where: { userId: authReq.user!.id },
                });
                if (studentProfile?.id !== application.studentId) {
                    throw new AppError('无权查看此申请', 403);
                }
            } else if (authReq.user!.role === 'COMPANY') {
                if (application.companyId !== authReq.user!.companyId) {
                    throw new AppError('无权查看此申请', 403);
                }
            } else if (authReq.user!.role === 'UNIVERSITY') {
                if (application.universityId !== authReq.user!.universityId) {
                    throw new AppError('无权查看此申请', 403);
                }
            }

            res.json({
                success: true,
                data: application,
            });
        } catch (error) {
            next(error);
        }
    }
);

// 更新申请（学生，仅限草稿状态）
router.put(
    '/:id',
    authenticate,
    authorize('STUDENT'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { id } = req.params;
            const { companyId, position, department, startDate, endDate, description } = req.body;

            const application = await prisma.internshipApplication.findUnique({
                where: { id },
            });

            if (!application) {
                throw new AppError('申请不存在', 404);
            }

            // 验证权限
            const studentProfile = await prisma.studentProfile.findUnique({
                where: { userId: authReq.user!.id },
            });
            if (studentProfile?.id !== application.studentId) {
                throw new AppError('无权修改此申请', 403);
            }

            // 只有草稿状态可以修改
            if (application.status !== 'DRAFT') {
                throw new AppError('只能修改草稿状态的申请', 400);
            }

            const updateData: any = {};
            if (companyId) updateData.companyId = companyId;
            if (position) updateData.position = position;
            if (department !== undefined) updateData.department = department;
            if (startDate) updateData.startDate = new Date(startDate);
            if (endDate) updateData.endDate = new Date(endDate);
            if (description !== undefined) updateData.description = description;

            const updatedApplication = await prisma.internshipApplication.update({
                where: { id },
                data: updateData,
                include: {
                    student: {
                        include: { user: { select: { name: true, email: true } } },
                    },
                    university: { select: { id: true, code: true, name: true } },
                    company: { select: { id: true, code: true, name: true } },
                },
            });

            res.json({
                success: true,
                message: '申请已更新',
                data: updatedApplication,
            });
        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 【流程第1.5步】学生提交申请
// 前端调 POST /applications/:id/submit
// 状态从 DRAFT → SUBMITTED
// 关键动作: 提交后自动通知企业(往通知表插记录)
// ==========================================
router.post(
    '/:id/submit',
    authenticate,
    authorize('STUDENT'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { id } = req.params;

            const application = await prisma.internshipApplication.findUnique({
                where: { id },
                include: { company: true },
            });

            if (!application) {
                throw new AppError('申请不存在', 404);
            }

            // 验证权限
            const studentProfile = await prisma.studentProfile.findUnique({
                where: { userId: authReq.user!.id },
            });
            if (studentProfile?.id !== application.studentId) {
                throw new AppError('无权操作此申请', 403);
            }

            if (application.status !== 'DRAFT') {
                throw new AppError('只能提交草稿状态的申请', 400);
            }

            // 【关键】状态更新: DRAFT → SUBMITTED
            await prisma.internshipApplication.update({
                where: { id },
                data: {
                    status: 'SUBMITTED',
                    submittedAt: new Date(),
                },
            });

            // 【关键】通知驱动: 查找企业下所有用户，逐一创建通知记录
            // 企业端的NotificationBell组件每30秒轮询一次，会自动显示新消息
            const companyUsers = await prisma.user.findMany({
                where: { companyId: application.companyId, role: 'COMPANY', isActive: true },
                select: { id: true },
            });

            for (const user of companyUsers) {
                await prisma.notification.create({
                    data: {
                        userId: user.id,
                        title: '新的实习证明申请',
                        content: `收到一份新的实习证明申请，申请编号：${application.applicationNo}`,
                        type: 'NEW_APPLICATION',
                        link: `/applications/${application.id}`,
                    },
                });
            }

            // 记录日志
            await prisma.auditLog.create({
                data: {
                    userId: authReq.user!.id,
                    action: 'SUBMIT_APPLICATION',
                    entityType: 'InternshipApplication',
                    entityId: id,
                },
            });

            res.json({
                success: true,
                message: '申请已提交',
            });
        } catch (error) {
            next(error);
        }
    }
);

// 撤回申请（学生）
router.post(
    '/:id/withdraw',
    authenticate,
    authorize('STUDENT'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { id } = req.params;

            const application = await prisma.internshipApplication.findUnique({
                where: { id },
            });

            if (!application) {
                throw new AppError('申请不存在', 404);
            }

            // 验证权限
            const studentProfile = await prisma.studentProfile.findUnique({
                where: { userId: authReq.user!.id },
            });
            if (studentProfile?.id !== application.studentId) {
                throw new AppError('无权操作此申请', 403);
            }

            // 只有已提交或企业评价中的状态可以撤回
            if (!['SUBMITTED', 'COMPANY_REVIEWING'].includes(application.status)) {
                throw new AppError('当前状态无法撤回', 400);
            }

            await prisma.internshipApplication.update({
                where: { id },
                data: { status: 'WITHDRAWN' },
            });

            res.json({
                success: true,
                message: '申请已撤回',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 【流程第2步】企业评价签章
// 前端调 POST /applications/:id/company-review
// 企业填写评分(1-100)和评语后提交
// 做3件事: ①生成电子签章 ②更新状态为COMPANY_APPROVED ③通知高校+学生
// ==========================================
router.post(
    '/:id/company-review',
    authenticate,
    authorize('COMPANY'),
    [
        body('score').isInt({ min: 1, max: 100 }).withMessage('评分必须在1-100之间'),
        body('evaluation').notEmpty().withMessage('请输入评语'),
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
            const { id } = req.params;
            const { score, evaluation, approved, rejectReason } = req.body;

            const application = await prisma.internshipApplication.findUnique({
                where: { id },
                include: { student: { include: { user: true } }, university: true },
            });

            if (!application) {
                throw new AppError('申请不存在', 404);
            }

            // 验证权限
            if (application.companyId !== authReq.user!.companyId) {
                throw new AppError('无权操作此申请', 403);
            }

            if (!['SUBMITTED', 'COMPANY_REVIEWING'].includes(application.status)) {
                throw new AppError('当前状态无法进行企业评价', 400);
            }

            if (approved === false) {
                // 企业拒绝
                await prisma.internshipApplication.update({
                    where: { id },
                    data: {
                        status: 'REJECTED',
                        companyRejectReason: rejectReason,
                    },
                });

                // 通知学生
                await prisma.notification.create({
                    data: {
                        userId: application.student.user.id,
                        title: '实习证明申请被拒绝',
                        content: `您的实习证明申请（${application.applicationNo}）已被企业拒绝。原因：${rejectReason || '未说明'}`,
                        type: 'APPLICATION_REJECTED',
                        link: `/applications/${application.id}`,
                    },
                });

                return res.json({
                    success: true,
                    message: '已拒绝申请',
                });
            }

            // 生成企业签章（使用时间戳和用户ID生成签名）
            const signatureData = {
                applicationId: id,
                companyId: authReq.user!.companyId,
                signedBy: authReq.user!.id,
                signedAt: new Date().toISOString(),
                score,
            };
            const signature = Buffer.from(JSON.stringify(signatureData)).toString('base64');

            // 更新申请
            await prisma.internshipApplication.update({
                where: { id },
                data: {
                    status: 'COMPANY_APPROVED',
                    companyScore: score,
                    companyEvaluation: evaluation,
                    companySignature: signature,
                    companySignedAt: new Date(),
                    companySignedBy: authReq.user!.id,
                },
            });

            // 通知高校审核
            const universityUsers = await prisma.user.findMany({
                where: { universityId: application.universityId, role: 'UNIVERSITY', isActive: true },
                select: { id: true },
            });

            for (const user of universityUsers) {
                await prisma.notification.create({
                    data: {
                        userId: user.id,
                        title: '实习证明待审核',
                        content: `企业已完成评价，请审核实习证明申请：${application.applicationNo}`,
                        type: 'PENDING_APPROVAL',
                        link: `/applications/${application.id}`,
                    },
                });
            }

            // 通知学生
            await prisma.notification.create({
                data: {
                    userId: application.student.user.id,
                    title: '企业已完成评价',
                    content: `您的实习证明申请（${application.applicationNo}）已获得企业签章，等待高校审核。`,
                    type: 'APPLICATION_PROGRESS',
                    link: `/applications/${application.id}`,
                },
            });

            // 记录日志
            await prisma.auditLog.create({
                data: {
                    userId: authReq.user!.id,
                    action: 'COMPANY_REVIEW',
                    entityType: 'InternshipApplication',
                    entityId: id,
                    newValue: JSON.stringify({ score, evaluation: evaluation.substring(0, 100) }),
                },
            });

            res.json({
                success: true,
                message: '企业评价已完成，已提交高校审核',
            });
        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 【流程第3步】高校审核 — 整个系统最核心的接口
// 前端调 POST /applications/:id/university-review
// 审核通过后做4件事:
//   ①生成证书编号+验证码  ②生成二维码
//   ③证书写入数据库(状态PENDING)  ④异步调用上链函数
// ==========================================
router.post(
    '/:id/university-review',
    authenticate,
    authorize('UNIVERSITY', 'ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { id } = req.params;
            const { approved, approval, rejectReason, autoUpchain = true } = req.body;

            const application = await prisma.internshipApplication.findUnique({
                where: { id },
                include: {
                    student: { include: { user: true } },
                    university: true,
                    company: true,
                },
            });

            if (!application) {
                throw new AppError('申请不存在', 404);
            }

            // 验证权限
            if (authReq.user!.role === 'UNIVERSITY' && application.universityId !== authReq.user!.universityId) {
                throw new AppError('无权操作此申请', 403);
            }

            if (!['COMPANY_APPROVED', 'UNIVERSITY_REVIEWING'].includes(application.status)) {
                throw new AppError('当前状态无法进行高校审核', 400);
            }

            if (approved === false) {
                // 高校拒绝
                await prisma.internshipApplication.update({
                    where: { id },
                    data: {
                        status: 'REJECTED',
                        universityRejectReason: rejectReason,
                    },
                });

                // 通知学生
                await prisma.notification.create({
                    data: {
                        userId: application.student.user.id,
                        title: '实习证明申请未通过审核',
                        content: `您的实习证明申请（${application.applicationNo}）未通过高校审核。原因：${rejectReason || '未说明'}`,
                        type: 'APPLICATION_REJECTED',
                        link: `/applications/${application.id}`,
                    },
                });

                return res.json({
                    success: true,
                    message: '已拒绝申请',
                });
            }

            // 【审核通过】以下是证书生成的核心逻辑
            // 第1步: 生成证书编号(CERT+年月+随机字符) 和 16位验证码
            const certNumber = generateCertNumber();
            const verifyCode = generateVerifyCode();
            // 拼接核验链接: 前端地址/verify/验证码 → 用于生成二维码
            const verifyUrl = `${config.getVerifyBaseUrl()}/${verifyCode}`;

            // 第2步: 将核验链接编码成二维码图片(Base64)
            const qrCode = await QRCode.toDataURL(verifyUrl, {
                width: 200,
                margin: 1,
                color: { dark: '#1a1a2e', light: '#ffffff' },
            });

            // 第3步: 证书写入数据库，初始状态为 PENDING(待上链)
            const certificate = await prisma.certificate.create({
                data: {
                    certNumber,
                    studentId: application.studentId,
                    universityId: application.universityId,
                    companyId: application.companyId,
                    issuerId: authReq.user!.id,
                    position: application.position,
                    department: application.department,
                    startDate: application.startDate,
                    endDate: application.endDate,
                    description: application.description,
                    evaluation: application.companyEvaluation,
                    status: 'PENDING',
                    verifyCode,
                    verifyUrl,
                    qrCode,
                },
            });

            // 更新申请状态
            await prisma.internshipApplication.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    universityApproval: approval,
                    universityApprovedAt: new Date(),
                    universityApprovedBy: authReq.user!.id,
                    certificateId: certificate.id,
                },
            });

            // 第4步: 如果勾选了自动上链，异步调用 processUpchain
            // 注意: 使用 .catch() 让上链在后台执行，接口立即返回，不阻塞用户
            if (autoUpchain && blockchainService.isContractAvailable()) {
                processUpchain(prisma, certificate.id).catch(console.error);
            }

            // 通知学生
            await prisma.notification.create({
                data: {
                    userId: application.student.user.id,
                    title: '实习证明已生成',
                    content: `您的实习证明申请（${application.applicationNo}）已通过审核，证书编号：${certNumber}`,
                    type: 'CERTIFICATE_ISSUED',
                    link: `/certificates/${certificate.id}`,
                },
            });

            // 记录日志
            await prisma.auditLog.create({
                data: {
                    userId: authReq.user!.id,
                    action: 'UNIVERSITY_APPROVE',
                    entityType: 'InternshipApplication',
                    entityId: id,
                    newValue: JSON.stringify({ certificateId: certificate.id, certNumber }),
                },
            });

            res.json({
                success: true,
                message: autoUpchain ? '审核通过，证书已创建并开始上链' : '审核通过，证书已创建',
                data: { certificateId: certificate.id, certNumber },
            });
        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 【流程第4步】区块链上链处理函数
// 由高校审核接口异步调用，在后台执行
// 做3件事: ①生成证书哈希 ②调用智能合约写入链上 ③更新数据库状态+通知学生
// ==========================================
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

            // 通知学生上链成功
            await prisma.notification.create({
                data: {
                    userId: certificate.student.user.id,
                    title: '实习证明已上链成功',
                    content: `您的实习证明（${certificate.certNumber}）已成功上链至区块链，可随时核验。`,
                    type: 'CERTIFICATE_UPCHAIN',
                    link: `/certificates/${certificateId}`,
                },
            });

            // 上链成功后生成PDF证书
            // 注意：PDF现在通过动态接口 GET /api/certificates/:id/pdf 生成
        } else {
            await prisma.certificate.update({
                where: { id: certificateId },
                data: { status: 'FAILED' },
            });

            // 通知学生上链失败
            await prisma.notification.create({
                data: {
                    userId: certificate.student.user.id,
                    title: '实习证明上链失败',
                    content: `您的实习证明（${certificate.certNumber}）上链失败，管理员将会重新处理。`,
                    type: 'CERTIFICATE_UPCHAIN_FAILED',
                    link: `/certificates/${certificateId}`,
                },
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

// 删除申请（管理员可强制删除任何状态的申请，关联证书也会被删除）
router.delete(
    '/:id',
    authenticate,
    authorize('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthRequest;
            const prisma = authReq.prisma;
            const { id } = req.params;

            const application = await prisma.internshipApplication.findUnique({
                where: { id },
                include: { certificate: true },
            });

            if (!application) {
                throw new AppError('申请不存在', 404);
            }

            // 如果申请关联了证书，先删除证书及其关联数据
            if (application.certificateId) {
                // 删除证书的核验记录
                await prisma.verification.deleteMany({
                    where: { certificateId: application.certificateId },
                });

                // 先解除申请与证书的关联
                await prisma.internshipApplication.update({
                    where: { id },
                    data: { certificateId: null },
                });

                // 删除证书（附件会因为 onDelete: Cascade 自动删除）
                await prisma.certificate.delete({
                    where: { id: application.certificateId },
                });
            }

            // 删除申请
            await prisma.internshipApplication.delete({
                where: { id },
            });

            // 记录日志
            await prisma.auditLog.create({
                data: {
                    userId: authReq.user!.id,
                    action: 'DELETE_APPLICATION',
                    entityType: 'InternshipApplication',
                    entityId: id,
                    newValue: JSON.stringify({
                        applicationNo: application.applicationNo,
                        status: application.status,
                        hasCertificate: !!application.certificateId,
                    }),
                },
            });

            res.json({
                success: true,
                message: '申请已删除' + (application.certificateId ? '（关联证书已同步删除）' : ''),
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;


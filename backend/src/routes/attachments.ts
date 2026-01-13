import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const certId = req.params.certificateId || 'temp';
    const certDir = path.join(uploadDir, certId);
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }
    cb(null, certDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// 文件过滤器
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许的文件类型
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // 最多5个文件
  }
});

// 计算文件哈希
function calculateFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// 上传附件到证明
router.post(
  '/:certificateId',
  authenticate,
  upload.array('files', 5),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const prisma: PrismaClient = (req as any).prisma;
      const { certificateId } = req.params;
      const { category = 'OTHER', description } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: '请选择要上传的文件' });
      }

      // 验证证明是否存在
      const certificate = await prisma.certificate.findUnique({
        where: { id: certificateId }
      });

      if (!certificate) {
        // 删除已上传的文件
        files.forEach(f => fs.unlinkSync(f.path));
        return res.status(404).json({ success: false, message: '证明不存在' });
      }

      // 保存附件记录
      const attachments = await Promise.all(
        files.map(async (file) => {
          const fileHash = calculateFileHash(file.path);
          
          return prisma.attachment.create({
            data: {
              certificateId,
              fileName: file.filename,
              originalName: file.originalname,
              fileSize: file.size,
              mimeType: file.mimetype,
              filePath: file.path,
              fileHash,
              category,
              description,
              uploadedBy: authReq.user?.id
            }
          });
        })
      );

      res.json({
        success: true,
        message: `成功上传 ${attachments.length} 个文件`,
        data: attachments
      });
    } catch (error: any) {
      console.error('上传附件失败:', error);
      res.status(500).json({ success: false, message: error.message || '上传失败' });
    }
  }
);

// 获取证明的所有附件
router.get('/:certificateId', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { certificateId } = req.params;

    const attachments = await prisma.attachment.findMany({
      where: { certificateId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: attachments.map(att => ({
        ...att,
        downloadUrl: `/api/attachments/download/${att.id}`
      }))
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 下载附件
router.get('/download/:attachmentId', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { attachmentId } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) {
      return res.status(404).json({ success: false, message: '附件不存在' });
    }

    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }

    res.download(attachment.filePath, attachment.originalName);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除附件
router.delete('/:attachmentId', authenticate, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = (req as any).prisma;
    const { attachmentId } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) {
      return res.status(404).json({ success: false, message: '附件不存在' });
    }

    // 删除文件
    if (fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
    }

    // 删除数据库记录
    await prisma.attachment.delete({
      where: { id: attachmentId }
    });

    res.json({ success: true, message: '附件已删除' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * #24 R-COM 企业岗位管理 API
 * 支持岗位 CRUD，学生申请时可从预设岗位列表选择
 */

// GET /api/positions — 获取当前企业的岗位列表（企业）或全部岗位（学生可见）
router.get('/', authenticate as any, async (req: any, res: Response) => {
  try {
    const user = req.user;
    let where: any = { isActive: true };

    if (user.role === 'COMPANY' && user.companyId) {
      where = { companyId: user.companyId };
    } else if (user.role === 'STUDENT') {
      where = { isActive: true };
    }

    const positions = await prisma.position.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { name: true } } },
    });

    res.json({ success: true, data: positions });
  } catch (error) {
    console.error('获取岗位列表失败:', error);
    res.status(500).json({ success: false, message: '获取岗位列表失败' });
  }
});

// POST /api/positions — 创建岗位（仅企业/管理员）
router.post('/',
  authenticate as any,
  body('title').notEmpty().withMessage('岗位名称必填'),
  async (req: any, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const user = req.user;
      if (!['COMPANY', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ success: false, message: '权限不足' });
      }

      const { title, department, description } = req.body;
      const position = await prisma.position.create({
        data: {
          title,
          department: department || '',
          description: description || '',
          companyId: user.companyId || null,
        },
      });

      res.status(201).json({ success: true, data: position });
    } catch (error) {
      console.error('创建岗位失败:', error);
      res.status(500).json({ success: false, message: '创建岗位失败' });
    }
  }
);

// PUT /api/positions/:id — 更新岗位
router.put('/:id', authenticate as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { title, department, description, isActive } = req.body;

    const position = await prisma.position.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(department !== undefined && { department }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: position });
  } catch (error) {
    console.error('更新岗位失败:', error);
    res.status(500).json({ success: false, message: '更新岗位失败' });
  }
});

// DELETE /api/positions/:id — 删除岗位
router.delete('/:id', authenticate as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.position.delete({ where: { id } });
    res.json({ success: true, message: '岗位已删除' });
  } catch (error) {
    console.error('删除岗位失败:', error);
    res.status(500).json({ success: false, message: '删除岗位失败' });
  }
});

export default router;

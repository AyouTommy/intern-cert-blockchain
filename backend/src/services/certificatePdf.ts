import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 证书完整信息类型
interface CertificateFull {
    id: string;
    certNumber: string;
    position: string;
    department?: string | null;
    startDate: Date;
    endDate: Date;
    description?: string | null;
    evaluation?: string | null;
    verifyUrl?: string | null;
    qrCode?: string | null;
    certHash?: string | null;
    txHash?: string | null;
    blockNumber?: number | null;
    chainId?: string | null;
    issuedAt?: Date | null;
    issuerId: string;
    student: {
        studentId: string;
        user: { name: string };
    };
    university: { name: string; code: string };
    company: { name: string; code: string };
}

// 字体路径
const FONT_PATH = path.join(__dirname, '../../fonts/NotoSansSC-Regular.otf');
const FONT_FALLBACK = 'Helvetica';

/**
 * 生成证书PDF
 */
export async function generateCertificatePdf(certificate: CertificateFull): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `实习证明 - ${certificate.certNumber}`,
                    Author: '链证通',
                    Subject: '区块链实习证明',
                },
            });

            const chunks: Buffer[] = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // 注册中文字体
            let fontName = FONT_FALLBACK;
            if (fs.existsSync(FONT_PATH)) {
                doc.registerFont('NotoSansSC', FONT_PATH);
                fontName = 'NotoSansSC';
            }

            const pageWidth = doc.page.width - 100;

            // 标题
            doc.font(fontName).fontSize(28).fillColor('#12204E')
                .text('实 习 证 明', { align: 'center' });
            doc.moveDown(0.5);

            // 副标题
            doc.fontSize(12).fillColor('#3E56A0')
                .text('INTERNSHIP CERTIFICATE', { align: 'center' });
            doc.moveDown(1.5);

            // 分隔线
            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
                .strokeColor('#C7D2FE').lineWidth(2).stroke();
            doc.moveDown(1);

            // 证书编号
            doc.fontSize(10).fillColor('#3E56A0')
                .text(`证书编号：${certificate.certNumber}`, { align: 'right' });
            doc.moveDown(1.5);

            // 正文
            doc.fontSize(14).fillColor('#12204E').lineGap(8);

            const startDateStr = certificate.startDate.toLocaleDateString('zh-CN');
            const endDateStr = certificate.endDate.toLocaleDateString('zh-CN');

            doc.text(`兹证明 ${certificate.student.user.name} 同学（学号：${certificate.student.studentId}）`, {
                align: 'left',
                continued: false,
            });
            doc.moveDown(0.5);

            doc.text(`于 ${startDateStr} 至 ${endDateStr} 期间，`, { align: 'left' });
            doc.moveDown(0.5);

            doc.text(`在 ${certificate.company.name} 完成实习。`, { align: 'left' });
            doc.moveDown(0.5);

            doc.text(`实习岗位：${certificate.position}${certificate.department ? `（${certificate.department}）` : ''}`, {
                align: 'left',
            });
            doc.moveDown(1.5);

            // 实习描述
            if (certificate.description) {
                doc.fontSize(12).fillColor('#3E56A0').text('实习内容：', { align: 'left' });
                doc.fontSize(12).fillColor('#12204E').text(certificate.description, {
                    align: 'left',
                    width: pageWidth,
                });
                doc.moveDown(1);
            }

            // 评语
            if (certificate.evaluation) {
                doc.fontSize(12).fillColor('#3E56A0').text('实习评价：', { align: 'left' });
                doc.fontSize(12).fillColor('#12204E').text(certificate.evaluation, {
                    align: 'left',
                    width: pageWidth,
                });
                doc.moveDown(1.5);
            }

            // 分隔线
            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
                .strokeColor('#C7D2FE').lineWidth(1).stroke();
            doc.moveDown(1);

            // 区块链验证信息
            doc.fontSize(11).fillColor('#3E56A0').text('区块链验证信息', { align: 'left' });
            doc.moveDown(0.5);

            doc.fontSize(9).fillColor('#12204E');
            if (certificate.certHash) {
                doc.text(`证明哈希: ${certificate.certHash}`, { align: 'left' });
            }
            if (certificate.txHash) {
                doc.text(`交易哈希: ${certificate.txHash}`, { align: 'left' });
            }
            if (certificate.blockNumber) {
                doc.text(`区块高度: #${certificate.blockNumber}`, { align: 'left' });
            }
            if (certificate.chainId) {
                doc.text(`链ID: ${certificate.chainId}`, { align: 'left' });
            }
            doc.moveDown(1);

            // 二维码区域
            if (certificate.qrCode && certificate.qrCode.startsWith('data:image')) {
                try {
                    const base64Data = certificate.qrCode.split(',')[1];
                    const imgBuffer = Buffer.from(base64Data, 'base64');
                    doc.image(imgBuffer, doc.page.width - 150, doc.y, { width: 100, height: 100 });
                } catch (e) {
                    // 二维码解析失败，跳过
                }
            }

            // 验证链接
            if (certificate.verifyUrl) {
                doc.fontSize(8).fillColor('#3E56A0')
                    .text(`扫描二维码或访问 ${certificate.verifyUrl} 验证真伪`, 50, doc.y + 110, {
                        align: 'center',
                        width: pageWidth,
                    });
            }

            // 签发信息
            doc.moveDown(3);
            doc.fontSize(12).fillColor('#12204E');

            const issuedDateStr = certificate.issuedAt
                ? certificate.issuedAt.toLocaleDateString('zh-CN')
                : new Date().toLocaleDateString('zh-CN');

            doc.text(`发证高校：${certificate.university.name}`, 50, doc.page.height - 120, { align: 'left' });
            doc.text(`签发日期：${issuedDateStr}`, 50, doc.page.height - 100, { align: 'left' });

            // 页脚
            doc.fontSize(8).fillColor('#7B8BB8')
                .text('本证明由链证通（区块链实习证明上链系统）生成，信息已永久存储于区块链', 50, doc.page.height - 50, {
                    align: 'center',
                    width: pageWidth,
                });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 确保证书PDF附件存在（幂等操作）
 */
export async function ensureCertificatePdfAttachment(
    prisma: PrismaClient,
    certificateId: string
): Promise<{ id: string; filePath: string; downloadUrl: string } | null> {
    // 获取完整证书信息
    const certificate = await prisma.certificate.findUnique({
        where: { id: certificateId },
        include: {
            student: { include: { user: { select: { name: true } } } },
            university: { select: { name: true, code: true } },
            company: { select: { name: true, code: true } },
        },
    });

    if (!certificate) {
        console.error(`Certificate not found: ${certificateId}`);
        return null;
    }

    // 生成PDF
    const pdfBuffer = await generateCertificatePdf(certificate as CertificateFull);

    // 确保目录存在
    const uploadDir = path.join(__dirname, '../../uploads', certificateId);
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 文件名
    const fileName = `internship_certificate_${certificate.certNumber}.pdf`;
    const filePath = path.join(uploadDir, fileName);

    // 写入文件
    fs.writeFileSync(filePath, pdfBuffer);

    // 计算文件哈希
    const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // 查找是否已存在相同类型的附件
    const existingAttachment = await prisma.attachment.findFirst({
        where: {
            certificateId,
            category: 'CERTIFICATE_PDF',
        },
    });

    let attachment;

    if (existingAttachment) {
        // 更新已存在的附件
        attachment = await prisma.attachment.update({
            where: { id: existingAttachment.id },
            data: {
                fileName,
                originalName: fileName,
                fileSize: pdfBuffer.length,
                mimeType: 'application/pdf',
                filePath,
                fileHash,
            },
        });
    } else {
        // 创建新附件
        attachment = await prisma.attachment.create({
            data: {
                certificateId,
                fileName,
                originalName: fileName,
                fileSize: pdfBuffer.length,
                mimeType: 'application/pdf',
                filePath,
                fileHash,
                category: 'CERTIFICATE_PDF',
                description: '系统自动生成的实习证明PDF文件',
                uploadedBy: certificate.issuerId,
            },
        });
    }

    console.log(`PDF generated for certificate ${certificate.certNumber}: ${filePath}`);

    return {
        id: attachment.id,
        filePath,
        downloadUrl: `/api/attachments/download/${attachment.id}`,
    };
}

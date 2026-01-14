import PDFDocument from 'pdfkit';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 证书完整信息类型
 */
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
    verifyCode?: string | null;
    qrCode?: string | null;
    certHash?: string | null;
    txHash?: string | null;
    blockNumber?: number | null;
    chainId?: string | null;
    issuedAt?: Date | null;
    createdAt: Date;
    issuerId: string;
    status: string;
    student: {
        studentId: string;
        user: { name: string };
    };
    university: {
        name: string;
        code: string;
        logo?: string | null;
    };
    company: {
        name: string;
        code: string;
        logo?: string | null;
    };
}

// 检测中文字体路径
const FONT_PATHS = [
    path.join(__dirname, '../../fonts/NotoSansSC-Regular.otf'),
    path.join(__dirname, '../../fonts/NotoSansCJKsc-Regular.otf'),
    path.join(__dirname, '../../fonts/SimHei.ttf'),
];

function getAvailableFont(): string | null {
    for (const fontPath of FONT_PATHS) {
        if (fs.existsSync(fontPath)) {
            return fontPath;
        }
    }
    return null;
}

/**
 * 格式化日期为中文格式
 */
function formatDateCN(date: Date): string {
    return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
}

/**
 * 绘制装饰性边框
 */
function drawDecorativeBorder(doc: PDFKit.PDFDocument, margin: number = 40) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // 外边框 - 深蓝色
    doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)
        .strokeColor('#1e3a5f')
        .lineWidth(2)
        .stroke();

    // 内边框 - 金色
    doc.rect(margin + 8, margin + 8, pageWidth - margin * 2 - 16, pageHeight - margin * 2 - 16)
        .strokeColor('#c9a962')
        .lineWidth(1)
        .stroke();

    // 四角装饰
    const cornerSize = 20;
    const corners = [
        { x: margin + 3, y: margin + 3 },
        { x: pageWidth - margin - 3, y: margin + 3 },
        { x: margin + 3, y: pageHeight - margin - 3 },
        { x: pageWidth - margin - 3, y: pageHeight - margin - 3 },
    ];

    corners.forEach((corner, i) => {
        doc.save();
        doc.strokeColor('#c9a962').lineWidth(2);

        // 根据角落位置绘制L形装饰
        if (i === 0) { // 左上
            doc.moveTo(corner.x, corner.y + cornerSize).lineTo(corner.x, corner.y).lineTo(corner.x + cornerSize, corner.y).stroke();
        } else if (i === 1) { // 右上
            doc.moveTo(corner.x - cornerSize, corner.y).lineTo(corner.x, corner.y).lineTo(corner.x, corner.y + cornerSize).stroke();
        } else if (i === 2) { // 左下
            doc.moveTo(corner.x, corner.y - cornerSize).lineTo(corner.x, corner.y).lineTo(corner.x + cornerSize, corner.y).stroke();
        } else { // 右下
            doc.moveTo(corner.x - cornerSize, corner.y).lineTo(corner.x, corner.y).lineTo(corner.x, corner.y - cornerSize).stroke();
        }
        doc.restore();
    });
}

/**
 * 绘制分隔线
 */
function drawDivider(doc: PDFKit.PDFDocument, y: number, type: 'gold' | 'simple' = 'gold') {
    const pageWidth = doc.page.width;
    const margin = 60;

    if (type === 'gold') {
        // 金色渐变分隔线
        doc.moveTo(margin, y)
            .lineTo(pageWidth / 2 - 20, y)
            .strokeColor('#c9a962')
            .lineWidth(1)
            .stroke();

        // 中间菱形装饰
        doc.save();
        doc.fillColor('#c9a962');
        doc.moveTo(pageWidth / 2, y - 4)
            .lineTo(pageWidth / 2 + 8, y)
            .lineTo(pageWidth / 2, y + 4)
            .lineTo(pageWidth / 2 - 8, y)
            .fill();
        doc.restore();

        doc.moveTo(pageWidth / 2 + 20, y)
            .lineTo(pageWidth - margin, y)
            .strokeColor('#c9a962')
            .lineWidth(1)
            .stroke();
    } else {
        doc.moveTo(margin, y)
            .lineTo(pageWidth - margin, y)
            .strokeColor('#e0e0e0')
            .lineWidth(0.5)
            .stroke();
    }
}

/**
 * 生成证书PDF Buffer - 精美设计版
 */
export async function generateCertificatePdf(certificate: CertificateFull): Promise<{ buffer: Buffer; hash: string }> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                info: {
                    Title: `实习证明 - ${certificate.certNumber}`,
                    Author: '链证通 · 高校实习证明上链系统',
                    Subject: '区块链实习证明',
                    Creator: 'InternCert Blockchain System',
                    Producer: 'PDFKit',
                },
                bufferPages: true,
            });

            const chunks: Buffer[] = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const hash = crypto.createHash('sha256').update(buffer).digest('hex');
                resolve({ buffer, hash });
            });
            doc.on('error', reject);

            // 注册中文字体
            const fontPath = getAvailableFont();
            let fontName = 'Helvetica';
            let fontBold = 'Helvetica-Bold';
            if (fontPath) {
                doc.registerFont('ChineseFont', fontPath);
                fontName = 'ChineseFont';
                fontBold = 'ChineseFont';
            }

            const pageWidth = doc.page.width;
            const contentWidth = pageWidth - 120;
            const centerX = pageWidth / 2;

            // ========== 第一页：主证书页 ==========

            // 绘制装饰边框
            drawDecorativeBorder(doc);

            // 顶部：发证机构
            let currentY = 80;
            doc.font(fontName).fontSize(12).fillColor('#1e3a5f')
                .text(certificate.university.name, 60, currentY, { align: 'center', width: contentWidth });

            // 主标题
            currentY += 35;
            doc.font(fontBold).fontSize(36).fillColor('#1e3a5f')
                .text('实 习 证 明', 60, currentY, { align: 'center', width: contentWidth });

            // 英文副标题
            currentY += 50;
            doc.font('Helvetica').fontSize(11).fillColor('#666666')
                .text('INTERNSHIP CERTIFICATE', 60, currentY, { align: 'center', width: contentWidth });

            // 金色分隔线
            currentY += 25;
            drawDivider(doc, currentY, 'gold');

            // 证书编号
            currentY += 15;
            doc.font(fontName).fontSize(10).fillColor('#888888')
                .text(`证书编号: ${certificate.certNumber}`, 60, currentY, { align: 'center', width: contentWidth });

            // 正文内容 - 居中对齐的段落
            currentY += 40;
            doc.font(fontName).fontSize(14).fillColor('#333333');

            const studentName = certificate.student.user.name;
            const companyName = certificate.company.name;
            const position = certificate.position;
            const startDate = formatDateCN(certificate.startDate);
            const endDate = formatDateCN(certificate.endDate);

            // 主要内容段落
            const mainText = `兹证明 ${studentName} 同学于 ${startDate} 至 ${endDate} 期间，在 ${companyName} 进行实习，担任 ${position} 岗位。`;

            doc.text(mainText, 80, currentY, {
                align: 'justify',
                width: contentWidth - 40,
                lineGap: 8,
            });

            currentY = doc.y + 20;

            // 部门信息
            if (certificate.department) {
                doc.font(fontName).fontSize(12).fillColor('#555555')
                    .text(`所属部门: ${certificate.department}`, 80, currentY, { width: contentWidth - 40 });
                currentY = doc.y + 15;
            }

            // 工作内容
            if (certificate.description) {
                currentY += 10;
                doc.font(fontName).fontSize(12).fillColor('#1e3a5f')
                    .text('【 工作内容 】', 80, currentY);
                currentY = doc.y + 8;
                doc.font(fontName).fontSize(11).fillColor('#444444')
                    .text(certificate.description, 80, currentY, {
                        width: contentWidth - 40,
                        lineGap: 5,
                    });
                currentY = doc.y + 15;
            }

            // 实习评价
            if (certificate.evaluation) {
                currentY += 10;
                doc.font(fontName).fontSize(12).fillColor('#1e3a5f')
                    .text('【 实习评价 】', 80, currentY);
                currentY = doc.y + 8;
                doc.font(fontName).fontSize(11).fillColor('#444444')
                    .text(certificate.evaluation, 80, currentY, {
                        width: contentWidth - 40,
                        lineGap: 5,
                    });
                currentY = doc.y + 15;
            }

            // 简单分隔线
            currentY += 20;
            drawDivider(doc, currentY, 'simple');

            // 确认主体区域
            currentY += 25;
            doc.font(fontName).fontSize(12).fillColor('#1e3a5f')
                .text('【 确认主体 】', 80, currentY);

            currentY += 25;
            doc.font(fontName).fontSize(11).fillColor('#333333');
            doc.text(`发证高校: ${certificate.university.name}`, 100, currentY);
            currentY += 20;
            doc.text(`实习单位: ${certificate.company.name}`, 100, currentY);
            currentY += 20;
            const issuedDate = certificate.issuedAt || certificate.createdAt;
            doc.text(`签发日期: ${formatDateCN(new Date(issuedDate))}`, 100, currentY);

            // 底部：盖章区域提示
            currentY = doc.page.height - 150;
            doc.font(fontName).fontSize(9).fillColor('#999999')
                .text('（本证书信息已上链存储，扫描第二页二维码可验证真伪）', 60, currentY, {
                    align: 'center',
                    width: contentWidth
                });

            // 页脚
            currentY = doc.page.height - 80;
            doc.font(fontName).fontSize(8).fillColor('#aaaaaa')
                .text('链证通 · 区块链实习证明上链系统', 60, currentY, { align: 'center', width: contentWidth });
            doc.text('ChainCert Internship Certification System', 60, currentY + 12, { align: 'center', width: contentWidth });

            // ========== 第二页：区块链存证页 ==========
            doc.addPage();
            drawDecorativeBorder(doc);

            currentY = 80;
            doc.font(fontBold).fontSize(20).fillColor('#1e3a5f')
                .text('区块链存证信息', 60, currentY, { align: 'center', width: contentWidth });

            currentY += 35;
            doc.font('Helvetica').fontSize(10).fillColor('#666666')
                .text('BLOCKCHAIN CERTIFICATION DETAILS', 60, currentY, { align: 'center', width: contentWidth });

            currentY += 25;
            drawDivider(doc, currentY, 'gold');

            // 状态徽章
            currentY += 30;
            if (certificate.status === 'ACTIVE' && certificate.certHash) {
                // 绘制状态徽章背景
                doc.roundedRect(centerX - 60, currentY - 5, 120, 28, 14)
                    .fillColor('#e8f5e9')
                    .fill();
                doc.roundedRect(centerX - 60, currentY - 5, 120, 28, 14)
                    .strokeColor('#4caf50')
                    .lineWidth(1)
                    .stroke();
                doc.font(fontName).fontSize(12).fillColor('#2e7d32')
                    .text('✓ 已上链认证', centerX - 50, currentY + 3, { width: 100, align: 'center' });
            }

            // 区块链详细信息
            currentY += 50;

            // 信息卡片背景
            const cardY = currentY;
            const cardHeight = 200;
            doc.roundedRect(70, cardY, contentWidth - 20, cardHeight, 8)
                .fillColor('#f8f9fa')
                .fill();
            doc.roundedRect(70, cardY, contentWidth - 20, cardHeight, 8)
                .strokeColor('#e0e0e0')
                .lineWidth(1)
                .stroke();

            currentY += 20;
            doc.font(fontName).fontSize(11).fillColor('#1e3a5f');

            // Certification Hash
            doc.text('Certification Hash (证明哈希)', 90, currentY);
            currentY += 18;
            doc.font('Courier').fontSize(9).fillColor('#333333')
                .text(certificate.certHash || 'N/A', 90, currentY, { width: contentWidth - 60 });

            // Transaction Hash
            currentY += 30;
            doc.font(fontName).fontSize(11).fillColor('#1e3a5f')
                .text('Transaction Hash (交易哈希)', 90, currentY);
            currentY += 18;
            doc.font('Courier').fontSize(9).fillColor('#333333')
                .text(certificate.txHash || 'N/A', 90, currentY, { width: contentWidth - 60 });

            // Block Number & Chain ID
            currentY += 30;
            doc.font(fontName).fontSize(11).fillColor('#1e3a5f');
            doc.text('Block Number (区块高度)', 90, currentY);
            doc.text('Chain ID (链标识)', 300, currentY);
            currentY += 18;
            doc.font('Courier').fontSize(12).fillColor('#333333');
            doc.text(`#${certificate.blockNumber?.toLocaleString() || 'N/A'}`, 90, currentY);
            doc.text(String(certificate.chainId || 'N/A'), 300, currentY);

            // 上链时间
            currentY += 30;
            doc.font(fontName).fontSize(11).fillColor('#1e3a5f')
                .text('Timestamp (上链时间)', 90, currentY);
            currentY += 18;
            const timestamp = certificate.issuedAt ? new Date(certificate.issuedAt).toISOString() : 'N/A';
            doc.font('Courier').fontSize(10).fillColor('#333333')
                .text(timestamp, 90, currentY);

            // 二维码验证区域
            currentY = cardY + cardHeight + 40;
            doc.font(fontName).fontSize(12).fillColor('#1e3a5f')
                .text('【 扫码验证 】', 60, currentY, { align: 'center', width: contentWidth });

            currentY += 30;

            // 二维码背景框
            const qrBoxSize = 130;
            const qrBoxX = centerX - qrBoxSize / 2;
            doc.roundedRect(qrBoxX - 10, currentY - 10, qrBoxSize + 20, qrBoxSize + 20, 8)
                .fillColor('#ffffff')
                .fill();
            doc.roundedRect(qrBoxX - 10, currentY - 10, qrBoxSize + 20, qrBoxSize + 20, 8)
                .strokeColor('#c9a962')
                .lineWidth(2)
                .stroke();

            // 二维码图片
            if (certificate.qrCode && certificate.qrCode.startsWith('data:image')) {
                try {
                    const base64Data = certificate.qrCode.split(',')[1];
                    const imgBuffer = Buffer.from(base64Data, 'base64');
                    doc.image(imgBuffer, qrBoxX, currentY, { width: qrBoxSize, height: qrBoxSize });
                } catch (e) {
                    doc.font(fontName).fontSize(10).fillColor('#999999')
                        .text('二维码', qrBoxX, currentY + qrBoxSize / 2 - 5, { width: qrBoxSize, align: 'center' });
                }
            } else {
                doc.font(fontName).fontSize(10).fillColor('#999999')
                    .text('[二维码]', qrBoxX, currentY + qrBoxSize / 2 - 5, { width: qrBoxSize, align: 'center' });
            }

            // 验证链接
            currentY += qrBoxSize + 25;
            doc.font(fontName).fontSize(10).fillColor('#666666')
                .text('验证链接:', 60, currentY, { align: 'center', width: contentWidth });
            currentY += 15;
            const verifyUrl = certificate.verifyUrl || `https://intern-cert-blockchain.vercel.app/verify/${certificate.verifyCode || ''}`;
            doc.font('Courier').fontSize(9).fillColor('#1565c0')
                .text(verifyUrl, 60, currentY, { align: 'center', width: contentWidth });

            // 页脚说明
            currentY = doc.page.height - 120;
            doc.font(fontName).fontSize(9).fillColor('#888888')
                .text('本证书信息已永久存储于以太坊区块链网络', 60, currentY, { align: 'center', width: contentWidth });
            currentY += 15;
            doc.text('任何人均可通过上述验证链接或扫描二维码核验证书真伪', 60, currentY, { align: 'center', width: contentWidth });
            currentY += 15;
            doc.text('如有争议，以链上记录为准', 60, currentY, { align: 'center', width: contentWidth });

            // 页脚
            currentY = doc.page.height - 80;
            doc.font(fontName).fontSize(8).fillColor('#aaaaaa')
                .text('链证通 · 区块链实习证明上链系统', 60, currentY, { align: 'center', width: contentWidth });
            doc.text(`文档哈希将在下载时计算 | 生成时间: ${new Date().toISOString()}`, 60, currentY + 12, { align: 'center', width: contentWidth });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

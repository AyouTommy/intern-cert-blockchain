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
 * 生成证书PDF Buffer
 * 按照用户详细要求设计内容和排版
 */
export async function generateCertificatePdf(certificate: CertificateFull): Promise<{ buffer: Buffer; hash: string }> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
                info: {
                    Title: `实习证明 - ${certificate.certNumber}`,
                    Author: '链证通 · 高校实习证明上链系统',
                    Subject: '区块链实习证明',
                    Creator: 'InternCert Blockchain System',
                    Producer: 'PDFKit',
                },
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
            if (fontPath) {
                doc.registerFont('ChineseFont', fontPath);
                fontName = 'ChineseFont';
            }

            const pageWidth = doc.page.width;
            const contentWidth = pageWidth - 100;
            const centerX = pageWidth / 2;

            // ==================== 顶部：高校名称 + 标题 ====================
            // 高校名称
            doc.font(fontName).fontSize(16).fillColor('#3E56A0')
                .text(certificate.university.name, 50, 50, { align: 'center', width: contentWidth });

            // 主标题
            doc.moveDown(0.8);
            doc.fontSize(32).fillColor('#12204E')
                .text('实 习 证 明', { align: 'center', width: contentWidth });

            // 英文副标题
            doc.moveDown(0.3);
            doc.fontSize(12).fillColor('#7B8BB8')
                .text('INTERNSHIP CERTIFICATE', { align: 'center', width: contentWidth });

            // 分隔线
            doc.moveDown(0.8);
            const lineY = doc.y;
            doc.moveTo(50, lineY).lineTo(pageWidth - 50, lineY)
                .strokeColor('#C7D2FE').lineWidth(2).stroke();

            // 证书编号
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#7B8BB8')
                .text(`证书编号: ${certificate.certNumber}`, { align: 'right', width: contentWidth });

            // ==================== 学生信息卡片 ====================
            doc.moveDown(1);
            const studentBoxY = doc.y;

            doc.fontSize(13).fillColor('#3B5BFF')
                .text('【学生信息】', 50, studentBoxY);

            doc.moveDown(0.5);
            doc.fontSize(12).fillColor('#12204E');
            doc.text(`姓    名: ${certificate.student.user.name}`, 70, doc.y);
            doc.moveDown(0.4);
            // 学号脱敏：显示前3位和后2位
            const studentId = certificate.student.studentId;
            const maskedId = studentId.length > 5
                ? `${studentId.slice(0, 3)}****${studentId.slice(-2)}`
                : studentId;
            doc.text(`学    号: ${maskedId}`, 70, doc.y);

            // ==================== 实习信息卡片 ====================
            doc.moveDown(1.2);
            doc.fontSize(13).fillColor('#3B5BFF')
                .text('【实习信息】', 50, doc.y);

            doc.moveDown(0.5);
            doc.fontSize(12).fillColor('#12204E');
            doc.text(`实习单位: ${certificate.company.name}`, 70, doc.y);
            doc.moveDown(0.4);
            doc.text(`实习岗位: ${certificate.position}`, 70, doc.y);

            if (certificate.department) {
                doc.moveDown(0.4);
                doc.text(`所属部门: ${certificate.department}`, 70, doc.y);
            }

            doc.moveDown(0.4);
            doc.text(`实习时间: ${formatDateCN(certificate.startDate)} 至 ${formatDateCN(certificate.endDate)}`, 70, doc.y);

            // 实习描述
            if (certificate.description) {
                doc.moveDown(0.4);
                doc.text(`工作内容:`, 70, doc.y);
                doc.moveDown(0.2);
                doc.fontSize(11).fillColor('#3E56A0')
                    .text(certificate.description, 90, doc.y, { width: contentWidth - 60 });
            }

            // ==================== 确认主体 ====================
            doc.moveDown(1.2);
            doc.fontSize(13).fillColor('#3B5BFF')
                .text('【确认主体】', 50, doc.y);

            doc.moveDown(0.5);
            doc.fontSize(12).fillColor('#12204E');
            doc.text(`发证高校: ${certificate.university.name}`, 70, doc.y);
            doc.moveDown(0.4);
            doc.text(`实习单位: ${certificate.company.name}`, 70, doc.y);

            // 签发日期
            doc.moveDown(0.4);
            const issuedDate = certificate.issuedAt || certificate.createdAt;
            doc.text(`签发日期: ${formatDateCN(new Date(issuedDate))}`, 70, doc.y);

            // ==================== 核验信息 + 二维码 ====================
            doc.moveDown(1.2);
            doc.fontSize(13).fillColor('#3B5BFF')
                .text('【核验信息】', 50, doc.y);

            const verifyBlockY = doc.y + 15;

            // 验证链接
            doc.fontSize(10).fillColor('#12204E')
                .text(`验证链接: ${certificate.verifyUrl || '暂无'}`, 70, verifyBlockY, { width: contentWidth - 150 });

            doc.moveDown(0.5);
            doc.fontSize(9).fillColor('#7B8BB8')
                .text('扫描右侧二维码或访问验证链接可核验证书真伪', 70, doc.y, { width: contentWidth - 150 });

            // 二维码（右侧）
            if (certificate.qrCode && certificate.qrCode.startsWith('data:image')) {
                try {
                    const base64Data = certificate.qrCode.split(',')[1];
                    const imgBuffer = Buffer.from(base64Data, 'base64');
                    doc.image(imgBuffer, pageWidth - 150, verifyBlockY - 10, { width: 90, height: 90 });
                } catch (e) {
                    // 二维码解析失败，跳过
                    console.warn('QR code parsing failed');
                }
            }

            // ==================== 区块链存证信息 ====================
            if (certificate.certHash && certificate.status === 'ACTIVE') {
                doc.moveDown(2);

                // 区块链区块背景
                const blockchainY = doc.y;
                doc.rect(50, blockchainY - 5, contentWidth, 100)
                    .fillColor('#F0F4FF').fill();

                doc.fontSize(11).fillColor('#3B5BFF')
                    .text('【区块链存证】 ✓ 已上链', 60, blockchainY + 5);

                doc.moveDown(0.5);
                doc.font('Courier').fontSize(8).fillColor('#3E56A0');

                // 证明哈希
                const certHashShort = certificate.certHash.length > 20
                    ? `${certificate.certHash.slice(0, 10)}...${certificate.certHash.slice(-10)}`
                    : certificate.certHash;
                doc.text(`Certification Hash: ${certHashShort}`, 60, doc.y);

                // 交易哈希
                if (certificate.txHash) {
                    doc.moveDown(0.3);
                    const txHashShort = certificate.txHash.length > 20
                        ? `${certificate.txHash.slice(0, 10)}...${certificate.txHash.slice(-10)}`
                        : certificate.txHash;
                    doc.text(`Transaction Hash:   ${txHashShort}`, 60, doc.y);
                }

                // 区块信息
                doc.moveDown(0.3);
                doc.text(`Block Number: #${certificate.blockNumber?.toLocaleString() || 'N/A'}    Chain ID: ${certificate.chainId || 'N/A'}`, 60, doc.y);

                // 上链时间
                if (certificate.issuedAt) {
                    doc.moveDown(0.3);
                    doc.text(`Timestamp: ${new Date(certificate.issuedAt).toISOString()}`, 60, doc.y);
                }

                // 恢复字体
                doc.font(fontName);
            }

            // ==================== 页脚 ====================
            const footerY = doc.page.height - 70;

            // 分隔线
            doc.moveTo(50, footerY - 10).lineTo(pageWidth - 50, footerY - 10)
                .strokeColor('#C7D2FE').lineWidth(1).stroke();

            // 免责声明
            doc.fontSize(8).fillColor('#7B8BB8')
                .text('本证明由「链证通」区块链实习证明上链系统生成，信息已永久存储于区块链。', 50, footerY, {
                    align: 'center',
                    width: contentWidth,
                });

            doc.moveDown(0.3);
            doc.text('如有争议，以链上记录为准。', {
                align: 'center',
                width: contentWidth,
            });

            doc.moveDown(0.3);
            doc.fontSize(7).fillColor('#A0AEC0')
                .text('© 2026 链证通. All rights reserved.', {
                    align: 'center',
                    width: contentWidth,
                });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

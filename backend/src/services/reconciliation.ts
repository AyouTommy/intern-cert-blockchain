import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { blockchainService } from './blockchain';

const prisma = new PrismaClient();

/**
 * 链上状态定时对账服务
 * 每 5 分钟扫描一次，处理因网络异常导致的数据库与链上状态不一致
 */
export function startReconciliationJob() {
  // 每 5 分钟执行一次
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 [定时对账] 开始扫描...');
    
    try {
      // 查找创建超过 5 分钟仍为 PENDING 的证书
      const stalePending = await prisma.certificate.findMany({
        where: {
          status: 'PENDING',
          certHash: { not: null },
          createdAt: {
            lt: new Date(Date.now() - 5 * 60 * 1000)
          }
        },
        take: 20, // 每次最多处理 20 条，避免过载
      });

      if (stalePending.length === 0) {
        return; // 无需处理
      }

      console.log(`🔄 [定时对账] 发现 ${stalePending.length} 条超时 PENDING 证书`);

      let fixed = 0;
      for (const cert of stalePending) {
        if (!cert.certHash) continue;

        try {
          const onChain = await blockchainService.verifyCertificate(cert.certHash);
          
          if (onChain.isValid) {
            // 链上已有效，但数据库还是 PENDING → 补偿更新
            await prisma.certificate.update({
              where: { id: cert.id },
              data: { status: 'ACTIVE' }
            });
            console.log(`  ✅ 补偿更新: ${cert.certNumber} → ACTIVE`);
            fixed++;
          } else if (cert.retryCount >= 3) {
            // 重试 3 次都失败，标记为 FAILED
            await prisma.certificate.update({
              where: { id: cert.id },
              data: {
                status: 'FAILED',
                failReason: '链上对账失败: 交易未被确认'
              }
            });
            console.log(`  ❌ 标记失败: ${cert.certNumber} (重试${cert.retryCount}次)`);
          } else {
            // 增加重试计数
            await prisma.certificate.update({
              where: { id: cert.id },
              data: {
                retryCount: { increment: 1 },
                lastRetryAt: new Date()
              }
            });
          }
        } catch (err) {
          console.error(`  ⚠️ 对账失败 ${cert.certNumber}:`, err);
        }
      }

      if (fixed > 0) {
        console.log(`🔄 [定时对账] 完成，修复 ${fixed} 条记录`);
      }
    } catch (error) {
      console.error('🔄 [定时对账] 服务异常:', error);
    }
  });

  console.log('⏰ 链上状态定时对账服务已启动（每5分钟）');
}

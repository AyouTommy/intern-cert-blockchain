/**
 * 批量上链脚本
 * 用于将待处理的证明批量上链到区块链
 * 
 * 使用方法:
 * npx tsx scripts/batch-upchain.ts [--dry-run] [--limit <number>]
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface ContractConfig {
  address: string;
  abi: any[];
  chainId: number;
}

interface UpchainResult {
  success: boolean;
  certId: string;
  certNumber: string;
  txHash?: string;
  error?: string;
}

async function main() {
  console.log('\n🚀 批量上链脚本启动\n');

  // 解析命令行参数
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) || 50 : 50;

  if (dryRun) {
    console.log('⚠️  模拟运行模式（不会实际上链）\n');
  }

  // 加载合约配置
  const contractPath = path.join(__dirname, '../backend/src/contracts/InternshipCertification.json');
  if (!fs.existsSync(contractPath)) {
    console.error('❌ 合约配置文件不存在，请先部署合约');
    process.exit(1);
  }

  const contractConfig: ContractConfig = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  console.log(`📍 合约地址: ${contractConfig.address}`);
  console.log(`🔗 链ID: ${contractConfig.chainId}\n`);

  // 连接区块链
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545');
  const privateKey = process.env.SIGNER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractConfig.address, contractConfig.abi, signer);

  console.log(`👤 签名者地址: ${signer.address}\n`);

  // 查询待上链的证明
  const pendingCerts = await prisma.certificate.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
    },
    take: limit,
    include: {
      student: { include: { user: true } },
      university: true,
      company: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (pendingCerts.length === 0) {
    console.log('✅ 没有待上链的证明\n');
    return;
  }

  console.log(`📋 找到 ${pendingCerts.length} 条待上链证明\n`);
  console.log('─'.repeat(60));

  const results: UpchainResult[] = [];

  for (let i = 0; i < pendingCerts.length; i++) {
    const cert = pendingCerts[i];
    console.log(`\n[${i + 1}/${pendingCerts.length}] ${cert.certNumber}`);
    console.log(`   学生: ${cert.student.user.name} (${cert.student.studentId})`);
    console.log(`   企业: ${cert.company.name}`);
    console.log(`   岗位: ${cert.position}`);

    if (dryRun) {
      console.log('   ✓ 模拟上链成功');
      results.push({
        success: true,
        certId: cert.id,
        certNumber: cert.certNumber,
      });
      continue;
    }

    try {
      // 生成证明哈希
      const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'string', 'string', 'uint256', 'uint256', 'string'],
        [
          cert.student.studentId,
          cert.university.code,
          cert.company.code,
          cert.position,
          Math.floor(cert.startDate.getTime() / 1000),
          Math.floor(cert.endDate.getTime() / 1000),
          cert.certNumber,
        ]
      );
      const certHash = ethers.keccak256(encoded);

      // 更新状态为处理中
      await prisma.certificate.update({
        where: { id: cert.id },
        data: { status: 'PROCESSING' },
      });

      // 生成内容完整性哈希
      const contentEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'string', 'string', 'string', 'uint256', 'uint256', 'string', 'string'],
        [
          cert.student.studentId,
          cert.university.code,
          cert.company.code,
          cert.position,
          '',
          Math.floor(cert.startDate.getTime() / 1000),
          Math.floor(cert.endDate.getTime() / 1000),
          '',
          cert.certNumber,
        ]
      );
      const contentHash = ethers.keccak256(contentEncoded);

      // 调用合约
      const tx = await contract.createCertificate(
        certHash,
        cert.student.user.walletAddress || ethers.ZeroAddress,
        cert.student.studentId,
        cert.university.code,
        cert.company.code,
        Math.floor(cert.startDate.getTime() / 1000),
        Math.floor(cert.endDate.getTime() / 1000),
        contentHash
      );

      const receipt = await tx.wait();

      // 更新数据库
      await prisma.certificate.update({
        where: { id: cert.id },
        data: {
          status: 'ACTIVE',
          certHash,
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          chainId: contractConfig.chainId,
          issuedAt: new Date(),
        },
      });

      console.log(`   ✅ 上链成功 | TX: ${receipt.hash.slice(0, 18)}...`);
      results.push({
        success: true,
        certId: cert.id,
        certNumber: cert.certNumber,
        txHash: receipt.hash,
      });
    } catch (error: any) {
      console.log(`   ❌ 上链失败: ${error.reason || error.message}`);
      
      await prisma.certificate.update({
        where: { id: cert.id },
        data: { status: 'FAILED' },
      });

      results.push({
        success: false,
        certId: cert.id,
        certNumber: cert.certNumber,
        error: error.reason || error.message,
      });
    }
  }

  // 输出统计
  console.log('\n' + '─'.repeat(60));
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`\n📊 上链统计:`);
  console.log(`   成功: ${successCount}`);
  console.log(`   失败: ${failCount}`);
  console.log(`   总计: ${results.length}`);

  if (failCount > 0) {
    console.log('\n❌ 失败的证明:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.certNumber}: ${r.error}`);
    });
  }

  console.log('\n✅ 批量上链完成\n');
}

main()
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

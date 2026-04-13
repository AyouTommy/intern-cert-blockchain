import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ContractConfig {
  address: string;
  abi: any[];
  chainId: number;
}

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wsProvider: ethers.WebSocketProvider | null = null;
  private signer: ethers.Wallet;
  private universityWallet: ethers.Wallet;
  private companyWallet: ethers.Wallet;
  private contract: ethers.Contract | null = null;
  private universityContract: ethers.Contract | null = null;
  private companyContract: ethers.Contract | null = null;
  private contractConfig: ContractConfig | null = null;
  private rolesSetup = false;

  // Hardhat 默认测试账户私钥（仅开发环境用）
  private static DEFAULT_KEYS = {
    admin: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    university: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    company: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  };

  constructor() {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Alchemy WebSocket Provider（用于实时事件监听）
    const wsUrl = rpcUrl.replace('https://', 'wss://').replace('/v2/', '/v2/');
    if (wsUrl.startsWith('wss://')) {
      try {
        this.wsProvider = new ethers.WebSocketProvider(wsUrl);
        console.log('🔌 WebSocket Provider 已连接:', wsUrl.slice(0, 40) + '...');
      } catch (err) {
        console.warn('⚠️ WebSocket 连接失败，回退到 HTTP 轮询');
        this.wsProvider = null;
      }
    }
    
    // 管理员钱包
    let privateKey = process.env.SIGNER_PRIVATE_KEY || BlockchainService.DEFAULT_KEYS.admin;
    if (privateKey && !privateKey.startsWith('0x')) privateKey = '0x' + privateKey;
    this.signer = new ethers.Wallet(privateKey, this.provider);

    // 高校钱包（独立地址，用于多方确认）
    let uniKey = process.env.UNIVERSITY_PRIVATE_KEY || BlockchainService.DEFAULT_KEYS.university;
    if (uniKey && !uniKey.startsWith('0x')) uniKey = '0x' + uniKey;
    this.universityWallet = new ethers.Wallet(uniKey, this.provider);

    // 企业钱包（独立地址，用于多方确认）
    let compKey = process.env.COMPANY_PRIVATE_KEY || BlockchainService.DEFAULT_KEYS.company;
    if (compKey && !compKey.startsWith('0x')) compKey = '0x' + compKey;
    this.companyWallet = new ethers.Wallet(compKey, this.provider);

    console.log('🔑 管理员地址:', this.signer.address);
    console.log('🏫 高校钱包地址:', this.universityWallet.address);
    console.log('🏢 企业钱包地址:', this.companyWallet.address);
    
    this.loadContract();
  }

  private loadContract() {
    try {
      const contractPath = path.join(__dirname, '../contracts/InternshipCertification.json');
      if (fs.existsSync(contractPath)) {
        const config = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        this.contractConfig = config;
        this.contract = new ethers.Contract(config.address, config.abi, this.signer);
        // 为高校和企业钱包分别创建合约实例
        this.universityContract = new ethers.Contract(config.address, config.abi, this.universityWallet);
        this.companyContract = new ethers.Contract(config.address, config.abi, this.companyWallet);
        console.log('✅ 区块链合约已加载:', config.address);
        // 启动事件监听
        this.listenForEvents();
        // 自动授予角色
        this.setupRoles();
      } else {
        console.log('⚠️ 合约配置文件不存在，请先部署合约');
      }
    } catch (error) {
      console.error('❌ 加载合约失败:', error);
    }
  }

  // ==========================================
  //! 【角色初始化】启动时自动给高校和企业钱包授予链上角色
  // ==========================================
  private async setupRoles() {
    if (!this.contract || this.rolesSetup) return;
    try {
      const UNIVERSITY_ROLE = ethers.keccak256(ethers.toUtf8Bytes('UNIVERSITY_ROLE'));
      const COMPANY_ROLE = ethers.keccak256(ethers.toUtf8Bytes('COMPANY_ROLE'));

      // 检查是否已有角色
      const uniHasRole = await this.contract.hasRole(UNIVERSITY_ROLE, this.universityWallet.address);
      if (!uniHasRole) {
        const tx = await this.contract.grantUniversityRole(this.universityWallet.address, 'DEFAULT_UNIVERSITY');
        await tx.wait();
        console.log('✅ 高校角色已授予:', this.universityWallet.address);
      }

      const compHasRole = await this.contract.hasRole(COMPANY_ROLE, this.companyWallet.address);
      if (!compHasRole) {
        const tx = await this.contract.grantCompanyRole(this.companyWallet.address, 'DEFAULT_COMPANY');
        await tx.wait();
        console.log('✅ 企业角色已授予:', this.companyWallet.address);
      }

      this.rolesSetup = true;
      console.log('🔐 链上角色初始化完成');
    } catch (error) {
      console.warn('⚠️ 角色初始化失败（不影响核心功能）:', (error as Error).message);
    }
  }

  // ==========================================
  //! 【区块链事件监听】实时监听链上事件 + DB 补偿同步
  // 当链上有证书创建、撤销等操作时自动检查并修正数据库状态
  // ==========================================
  private listenForEvents() {
    if (!this.contract || !this.contractConfig) return;

    // 优先用 WebSocket Provider 监听（实时性更好）
    const eventContract = this.wsProvider
      ? new ethers.Contract(this.contractConfig.address, this.contractConfig.abi, this.wsProvider)
      : this.contract;
    const providerType = this.wsProvider ? 'WebSocket' : 'HTTP';
    console.log(`📡 事件监听使用 ${providerType} 模式`);

    try {
      eventContract.on('CertificateCreated',
        async (certHash: string, issuer: string, student: string, studentId: string, timestamp: bigint) => {
          console.log(`📢 链上事件 [证书创建] Hash: ${certHash}, 学号: ${studentId}`);
          // DB 补偿：确保链上已创建的证书在数据库中也是 ACTIVE
          try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const cert = await prisma.certificate.findFirst({ where: { certHash } });
            if (cert && cert.status === 'PENDING') {
              await prisma.certificate.update({
                where: { id: cert.id },
                data: { status: 'ACTIVE' }
              });
              console.log(`🔄 [事件补偿] 证书 ${certHash.slice(0, 10)}... 状态同步为 ACTIVE`);
            }
            await prisma.$disconnect();
            // WebSocket 实时推送前端
            BlockchainService.emitSocketEvent('certificate:created', { certHash, studentId, status: 'ACTIVE' });
          } catch (err) {
            console.error('[事件补偿-创建] 失败:', err);
          }
        }
      );

      eventContract.on('CertificateRevoked',
        async (certHash: string, revoker: string, reason: string, timestamp: bigint) => {
          console.log(`📢 链上事件 [证书撤销] Hash: ${certHash}, 原因: ${reason}`);
          try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const cert = await prisma.certificate.findFirst({ where: { certHash } });
            if (cert && cert.status !== 'REVOKED') {
              await prisma.certificate.update({
                where: { id: cert.id },
                data: { status: 'REVOKED', revokeReason: reason, revokedAt: new Date() }
              });
              console.log(`🔄 [事件补偿] 证书 ${certHash.slice(0, 10)}... 状态同步为 REVOKED`);
            }
            await prisma.$disconnect();
            BlockchainService.emitSocketEvent('certificate:revoked', { certHash, reason });
          } catch (err) {
            console.error('[事件补偿-撤销] 失败:', err);
          }
        }
      );

      eventContract.on('CertificateFinalized',
        async (certHash: string, universityAddr: string, companyAddr: string, timestamp: bigint) => {
          console.log(`📢 链上事件 [多方确认完成] Hash: ${certHash}`);
          try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const cert = await prisma.certificate.findFirst({ where: { certHash } });
            if (cert && (cert.status !== 'ACTIVE' || !cert.universityAddr || !cert.companyAddr)) {
              await prisma.certificate.update({
                where: { id: cert.id },
                data: {
                  status: 'ACTIVE',
                  universityAddr,
                  companyAddr,
                }
              });
              console.log(`🔄 [事件补偿] 证书 ${certHash.slice(0, 10)}... 多方确认信息已同步`);
            }
            await prisma.$disconnect();
            BlockchainService.emitSocketEvent('certificate:finalized', { certHash, universityAddr, companyAddr });
          } catch (err) {
            console.error('[事件补偿-确认] 失败:', err);
          }
        }
      );

      eventContract.on('ConfirmationReceived',
        (certHash: string, confirmer: string, role: string, timestamp: bigint) => {
          console.log(`📢 链上事件 [确认收到] ${role} - ${confirmer}`);
          BlockchainService.emitSocketEvent('certificate:confirmed', { certHash, confirmer, role });
        }
      );

      console.log('👂 区块链事件监听已启动（含 DB 补偿 + WebSocket 推送）');
    } catch (error) {
      console.warn('⚠️ 事件监听启动失败（不影响核心功能）:', error);
    }
  }

  // ==========================================
  //! 【Socket.IO 实时推送】链上事件 -> 前端
  // ==========================================
  private static socketIO: any = null;

  static setSocketIO(io: any) {
    BlockchainService.socketIO = io;
    console.log('🔗 Socket.IO 已绑定到 BlockchainService');
  }

  private static emitSocketEvent(event: string, data: any) {
    if (BlockchainService.socketIO) {
      BlockchainService.socketIO.emit(event, data);
      console.log(`📤 WebSocket 推送: ${event}`);
    }
  }

  // 重新加载合约
  reloadContract() {
    this.loadContract();
  }

  // 检查合约是否可用
  isContractAvailable(): boolean {
    return this.contract !== null;
  }

  // 获取合约地址
  getContractAddress(): string | null {
    return this.contractConfig?.address || null;
  }

  // 获取 chainId
  getChainId(): number {
    return this.contractConfig?.chainId || 31337;
  }

  // ==========================================
  //! 【上链第1步】生成证书哈希（"数字指纹"）
  // 将学号、高校编码、企业编码、岗位、起止时间、证书编号 7个字段编码后哈希
  // 任何一个字段变了，哈希就完全不同 — 这就是防篡改的核心原理
  // ==========================================
  generateCertHash(data: {
    studentId: string;
    universityId: string;
    companyId: string;
    position: string;
    startDate: number;
    endDate: number;
    certNumber: string;
  }): string {
    // 用以太坊的标准编码方式将数据打包
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'string', 'string', 'uint256', 'uint256', 'string'],
      [
        data.studentId,
        data.universityId,
        data.companyId,
        data.position,
        data.startDate,
        data.endDate,
        data.certNumber,
      ]
    );
    // 用"凯卡克256"哈希算法计算出唯一的256位哈希值
    return ethers.keccak256(encoded);
  }

  // ==========================================
  //! 【上链第2步】调用智能合约的"创建证书"方法
  // 将哈希值和证书信息写入以太坊区块链
  // 发起交易后等待矿工确认，确认后返回交易哈希和区块高度
  // ==========================================
  async createCertificate(params: {
    certHash: string;
    studentAddress: string;
    studentId: string;
    universityId: string;
    companyId: string;
    startDate: number;
    endDate: number;
    contentHash?: string;
  }): Promise<{
    success: boolean;
    txHash?: string;
    blockNumber?: number;
    error?: string;
  }> {
    if (!this.contract) {
      return { success: false, error: '合约未加载' };
    }

    try {
      // 调用合约的"创建证书"函数，发起链上交易
      const tx = await this.contract.createCertificate(
        params.certHash,
        params.studentAddress || ethers.ZeroAddress,
        params.studentId,
        params.universityId,
        params.companyId,
        params.startDate,
        params.endDate,
        params.contentHash || '',
        { gasLimit: 500000 }
      );

      // 等待区块链网络确认这笔交易，指定 1 个区块确认
      const receipt = await tx.wait(1);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('上链失败:', error);
      return {
        success: false,
        error: error.reason || error.message || '上链失败',
      };
    }
  }

  // 批量创建证明
  async batchCreateCertificates(params: {
    certHashes: string[];
    studentAddresses: string[];
    studentIds: string[];
    universityId: string;
    companyId: string;
    startDates: number[];
    endDates: number[];
  }): Promise<{
    success: boolean;
    txHash?: string;
    blockNumber?: number;
    error?: string;
  }> {
    if (!this.contract) {
      return { success: false, error: '合约未加载' };
    }

    try {
      const tx = await this.contract.batchCreateCertificates(
        params.certHashes,
        params.studentAddresses,
        params.studentIds,
        params.universityId,
        params.companyId,
        params.startDates,
        params.endDates,
        { gasLimit: 1500000 }
      );

      const receipt = await tx.wait(1);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('批量上链失败:', error);
      return {
        success: false,
        error: error.reason || error.message || '批量上链失败',
      };
    }
  }

  // ==========================================
  //! 【链上验证】验证证书（view函数，不花Gas）
  // 核验时调用，拿着哈希值去区块链上确认证书是否存在且有效
  // 同时返回过期状态，实现完整的证书状态检查
  // ==========================================
  async verifyCertificate(certHash: string): Promise<{
    isValid: boolean;
    isExpired: boolean;
    certificate?: {
      issuer: string;
      student: string;
      studentId: string;
      universityId: string;
      companyId: string;
      issueDate: number;
      startDate: number;
      endDate: number;
      status: number;
      contentHash: string;
    };
    error?: string;
  }> {
    if (!this.contract) {
      return { isValid: false, isExpired: false, error: '合约未加载' };
    }

    try {
      // verifyCertificate 现在是 view 函数，不花Gas，不需要 staticCall
      const result = await this.contract.verifyCertificate(certHash);
      const [isValid, cert, isExpired] = result;

      return {
        isValid,
        isExpired,
        certificate: {
          issuer: cert.issuer,
          student: cert.student,
          studentId: cert.studentId,
          universityId: cert.universityId,
          companyId: cert.companyId,
          issueDate: Number(cert.issueDate),
          startDate: Number(cert.startDate),
          endDate: Number(cert.endDate),
          status: Number(cert.status),
          contentHash: cert.contentHash,
        },
      };
    } catch (error: any) {
      console.error('验证失败:', error);
      return {
        isValid: false,
        isExpired: false,
        error: error.reason || error.message || '验证失败',
      };
    }
  }

  // ==========================================
  //! 【内容完整性验证】对比链上存储的内容哈希
  // 重新计算内容哈希，与链上存储的哈希对比
  // 如果不一致说明链下数据被篡改
  // ==========================================
  async verifyContentIntegrity(certHash: string, contentHash: string): Promise<boolean> {
    if (!this.contract) return false;
    try {
      return await this.contract.verifyContentIntegrity(certHash, contentHash);
    } catch {
      return false;
    }
  }

  // 获取证明详情
  async getCertificate(certHash: string): Promise<{
    success: boolean;
    certificate?: any;
    error?: string;
  }> {
    if (!this.contract) {
      return { success: false, error: '合约未加载' };
    }

    try {
      const cert = await this.contract.getCertificate(certHash);
      return {
        success: true,
        certificate: {
          certHash: cert.certHash,
          issuer: cert.issuer,
          student: cert.student,
          studentId: cert.studentId,
          universityId: cert.universityId,
          companyId: cert.companyId,
          issueDate: Number(cert.issueDate),
          startDate: Number(cert.startDate),
          endDate: Number(cert.endDate),
          status: Number(cert.status),
          contentHash: cert.contentHash,
          createdAt: Number(cert.createdAt),
          updatedAt: Number(cert.updatedAt),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.reason || error.message || '获取失败',
      };
    }
  }

  // 撤销证明
  async revokeCertificate(certHash: string, reason: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    if (!this.contract) {
      return { success: false, error: '合约未加载' };
    }

    try {
      const tx = await this.contract.revokeCertificate(certHash, reason, { gasLimit: 200000 });
      const receipt = await tx.wait(1);

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.reason || error.message || '撤销失败',
      };
    }
  }

  // 获取统计数据
  async getStatistics(): Promise<{
    success: boolean;
    stats?: {
      total: number;
      active: number;
      revoked: number;
    };
    error?: string;
  }> {
    if (!this.contract) {
      return { success: false, error: '合约未加载' };
    }

    try {
      const [total, active, revoked] = await this.contract.getStatistics();
      return {
        success: true,
        stats: {
          total: Number(total),
          active: Number(active),
          revoked: Number(revoked),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // 检查证明是否有效（含过期检测）
  async isValidCertificate(certHash: string): Promise<boolean> {
    if (!this.contract) return false;
    try {
      return await this.contract.isValidCertificate(certHash);
    } catch {
      return false;
    }
  }

  // 获取签名者地址
  getSignerAddress(): string {
    return this.signer.address;
  }

  // ==========================================
  //! 【多方确认 - 第1步】高校钱包提交证书请求
  // 用高校的独立钱包地址调用合约，链上记录高校地址
  // ==========================================
  async submitCertificateRequest(params: {
    certHash: string;
    studentId: string;
    universityId: string;
    companyId: string;
    startDate: number;
    endDate: number;
    contentHash: string;
    encryptedPrivKey?: string;
  }): Promise<{
    success: boolean;
    txHash?: string;
    universityAddr?: string;
    error?: string;
  }> {
    // 优先使用机构独立密钥
    let contract = this.universityContract;
    let walletAddr = this.universityWallet?.address;
    if (params.encryptedPrivKey) {
      const orgContract = this.getInstitutionContract(params.encryptedPrivKey);
      if (orgContract) {
        contract = orgContract;
        const privKey = BlockchainService.decryptPrivateKey(params.encryptedPrivKey);
        walletAddr = new ethers.Wallet(privKey).address;
        console.log(`🔑 使用高校独立密钥签名: ${walletAddr}`);
      }
    }
    if (!contract) {
      return { success: false, error: '高校合约实例未加载' };
    }
    try {
      const tx = await contract.submitCertificateRequest(
        params.certHash,
        params.studentId,
        params.universityId,
        params.companyId,
        params.startDate,
        params.endDate,
        params.contentHash,
        { gasLimit: 600000 }
      );
      await tx.wait(1);
      return {
        success: true,
        txHash: tx.hash,
        universityAddr: walletAddr,
      };
    } catch (error: any) {
      console.error('高校提交请求失败:', error);
      return { success: false, error: error.reason || error.message };
    }
  }

  // ==========================================
  //! 【多方确认 - 第2步】企业钱包确认证书
  // 用企业的独立钱包地址调用合约，链上记录企业地址
  // 双方都确认后合约自动 finalize
  // ==========================================
  async companyConfirmCertificate(certHash: string, encryptedPrivKey?: string): Promise<{
    success: boolean;
    txHash?: string;
    blockNumber?: number;
    companyAddr?: string;
    error?: string;
  }> {
    // 优先使用机构独立密钥
    let contract = this.companyContract;
    let walletAddr = this.companyWallet?.address;
    if (encryptedPrivKey) {
      const orgContract = this.getInstitutionContract(encryptedPrivKey);
      if (orgContract) {
        contract = orgContract;
        const privKey = BlockchainService.decryptPrivateKey(encryptedPrivKey);
        walletAddr = new ethers.Wallet(privKey).address;
        console.log(`🔑 使用企业独立密钥签名: ${walletAddr}`);
      }
    }
    if (!contract) {
      return { success: false, error: '企业合约实例未加载' };
    }
    try {
      const tx = await contract.companyConfirm(certHash, { gasLimit: 500000 });
      const receipt = await tx.wait(1);
      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        companyAddr: walletAddr,
      };
    } catch (error: any) {
      console.error('企业确认失败:', error);
      return { success: false, error: error.reason || error.message };
    }
  }

  // 获取多方确认地址信息（给前端展示用）
  getMultiPartyInfo(): {
    adminAddr: string;
    universityAddr: string;
    companyAddr: string;
  } {
    return {
      adminAddr: this.signer.address,
      universityAddr: this.universityWallet.address,
      companyAddr: this.companyWallet.address,
    };
  }

  // 获取网络信息
  async getNetworkInfo(): Promise<{
    chainId: number;
    name: string;
    blockNumber: number;
  }> {
    const network = await this.provider.getNetwork();
    const blockNumber = await this.provider.getBlockNumber();
    return {
      chainId: Number(network.chainId),
      name: network.name,
      blockNumber,
    };
  }
  // ==========================================
  //! 【机构独立密钥管理】为机构生成独立的以太坊钱包
  // 注册/审核通过时调用，密钥 AES-256-GCM 加密后存储
  // ==========================================
  generateInstitutionWallet(): { address: string; encryptedPrivKey: string } {
    const wallet = ethers.Wallet.createRandom();
    const encryptedPrivKey = BlockchainService.encryptPrivateKey(wallet.privateKey);
    return { address: wallet.address, encryptedPrivKey };
  }

  // AES-256-GCM 加密私钥
  static encryptPrivateKey(privateKey: string): string {
    const secret = process.env.KEY_ENCRYPTION_SECRET || 'default-dev-secret-key-32-bytes!';
    const key = crypto.scryptSync(secret, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  // AES-256-GCM 解密私钥
  static decryptPrivateKey(encryptedData: string): string {
    const secret = process.env.KEY_ENCRYPTION_SECRET || 'default-dev-secret-key-32-bytes!';
    const key = crypto.scryptSync(secret, 'salt', 32);
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // 为机构钱包授予链上角色
  async grantInstitutionRole(
    address: string,
    type: 'university' | 'company',
    entityId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.contract) {
      return { success: false, error: '合约未加载' };
    }
    try {
      const fn = type === 'university' ? 'grantUniversityRole' : 'grantCompanyRole';
      const tx = await this.contract[fn](address, entityId, { gasLimit: 200000 });
      await tx.wait(1);
      console.log(`✅ ${type} 角色已授予: ${address}`);
      return { success: true };
    } catch (error: any) {
      console.error(`角色授予失败 (${type}):`, error.message);
      return { success: false, error: error.message };
    }
  }

  // 使用机构独立密钥创建合约实例
  getInstitutionContract(encryptedPrivKey: string): ethers.Contract | null {
    if (!this.contractConfig) return null;
    try {
      const privateKey = BlockchainService.decryptPrivateKey(encryptedPrivKey);
      const wallet = new ethers.Wallet(privateKey, this.provider);
      return new ethers.Contract(this.contractConfig.address, this.contractConfig.abi, wallet);
    } catch (error) {
      console.error('解密机构密钥失败:', error);
      return null;
    }
  }

  // ==========================================
  //! 【EIP-712 签名验证】验证用户通过前端签名的授权消息
  // ==========================================
  verifyEIP712Signature(
    message: { action: string; certHash: string; timestamp: number },
    signature: string
  ): { valid: boolean; signer?: string; error?: string } {
    try {
      const domain = {
        name: 'InternshipCertification',
        version: '1',
        chainId: this.getChainId(),
        verifyingContract: this.getContractAddress() || ethers.ZeroAddress,
      };
      const types = {
        CertificateAction: [
          { name: 'action', type: 'string' },
          { name: 'certHash', type: 'bytes32' },
          { name: 'timestamp', type: 'uint256' },
        ],
      };
      const recovered = ethers.verifyTypedData(domain, types, message, signature);
      return { valid: true, signer: recovered };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  // ==========================================
  //! 【签名接口抽象层】预留 Web3Auth 等签名通道
  // 根据签名方式选择不同的执行路径
  // ==========================================
  async executeWithSignature(params: {
    signatureMethod: 'EIP712_CUSTODIAL' | 'WEB3AUTH' | 'LEGACY_PROXY';
    institutionContract?: ethers.Contract | null;
    functionName: string;
    args: any[];
    gasLimit?: number;
  }): Promise<{
    success: boolean;
    txHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    error?: string;
  }> {
    let contract: ethers.Contract | null = null;

    switch (params.signatureMethod) {
      case 'EIP712_CUSTODIAL':
        contract = params.institutionContract || null;
        break;
      case 'WEB3AUTH':
        // 预留：Web3Auth 签名通道
        // 当前降级到 LEGACY_PROXY
        console.log('⚠️ Web3Auth 通道尚未实现，降级为 LEGACY_PROXY');
        contract = this.contract;
        break;
      case 'LEGACY_PROXY':
      default:
        contract = this.contract;
        break;
    }

    if (!contract) {
      return { success: false, error: '合约实例不可用' };
    }

    try {
      const tx = await contract[params.functionName](
        ...params.args,
        { gasLimit: params.gasLimit || 500000 }
      );
      const receipt = await tx.wait(1);
      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.reason || error.message || '交易执行失败',
      };
    }
  }
}

export { BlockchainService };
export const blockchainService = new BlockchainService();

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

interface ContractConfig {
  address: string;
  abi: any[];
  chainId: number;
}

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract | null = null;
  private contractConfig: ContractConfig | null = null;

  constructor() {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    let privateKey = process.env.SIGNER_PRIVATE_KEY || 
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat默认私钥
    // 确保私钥有 0x 前缀
    if (privateKey && !privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    this.signer = new ethers.Wallet(privateKey, this.provider);
    
    this.loadContract();
  }

  private loadContract() {
    try {
      const contractPath = path.join(__dirname, '../contracts/InternshipCertification.json');
      if (fs.existsSync(contractPath)) {
        const config = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        this.contractConfig = config;
        this.contract = new ethers.Contract(
          config.address,
          config.abi,
          this.signer
        );
        console.log('✅ 区块链合约已加载:', config.address);
      } else {
        console.log('⚠️ 合约配置文件不存在，请先部署合约');
      }
    } catch (error) {
      console.error('❌ 加载合约失败:', error);
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

  // 生成证明哈希
  generateCertHash(data: {
    studentId: string;
    universityId: string;
    companyId: string;
    position: string;
    startDate: number;
    endDate: number;
    certNumber: string;
  }): string {
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
    return ethers.keccak256(encoded);
  }

  // 创建证明上链
  async createCertificate(params: {
    certHash: string;
    studentAddress: string;
    studentId: string;
    universityId: string;
    companyId: string;
    startDate: number;
    endDate: number;
    ipfsHash?: string;
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
      const tx = await this.contract.createCertificate(
        params.certHash,
        params.studentAddress || ethers.ZeroAddress,
        params.studentId,
        params.universityId,
        params.companyId,
        params.startDate,
        params.endDate,
        params.ipfsHash || ''
      );

      const receipt = await tx.wait();

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
        params.endDates
      );

      const receipt = await tx.wait();

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

  // 验证证明
  async verifyCertificate(certHash: string): Promise<{
    isValid: boolean;
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
      ipfsHash: string;
    };
    error?: string;
  }> {
    if (!this.contract) {
      return { isValid: false, error: '合约未加载' };
    }

    try {
      const result = await this.contract.verifyCertificate.staticCall(certHash);
      const [isValid, cert] = result;

      return {
        isValid,
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
          ipfsHash: cert.ipfsHash,
        },
      };
    } catch (error: any) {
      console.error('验证失败:', error);
      return {
        isValid: false,
        error: error.reason || error.message || '验证失败',
      };
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
          ipfsHash: cert.ipfsHash,
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
      const tx = await this.contract.revokeCertificate(certHash, reason);
      const receipt = await tx.wait();

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

  // 检查证明是否有效
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
}

export const blockchainService = new BlockchainService();

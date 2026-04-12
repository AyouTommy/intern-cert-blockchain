import { ethers } from 'ethers';

/**
 * ECDSA 数字签名服务
 * 使用以太坊的椭圆曲线数字签名算法（ECDSA）实现不可伪造的数字签章
 * 替代之前的 Base64 编码方式，提供真正的密码学保障
 */
export class SignatureService {
  /**
   * 生成待签名的消息哈希
   * 将关键业务数据通过 ABI 编码后用 Keccak-256 哈希
   * 任何字段被篡改都会导致哈希值完全不同
   */
  static generateSignMessage(data: {
    applicationId: string;
    companyCode: string;
    score: number;
    evaluation: string;
    timestamp: number;
  }): string {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'uint256', 'string', 'uint256'],
      [data.applicationId, data.companyCode, data.score, data.evaluation, data.timestamp]
    );
    return ethers.keccak256(encoded);
  }

  /**
   * 使用私钥对消息进行 ECDSA 签名
   * 生成65字节的签名数据（r + s + v）
   * 签名后可通过签名恢复出签名者的以太坊地址
   */
  static async signMessage(messageHash: string, privateKey: string): Promise<string> {
    const wallet = new ethers.Wallet(privateKey);
    // 使用 EIP-191 标准签名前缀，防止签名消息被当作交易重放
    return await wallet.signMessage(ethers.getBytes(messageHash));
  }

  /**
   * 验证签名：从签名中恢复出签名者地址，与预期地址对比
   * 如果恢复出的地址与预期一致，说明签名确实由该地址的私钥持有者生成
   */
  static verifySignature(
    messageHash: string,
    signature: string,
    expectedAddress: string
  ): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(messageHash),
        signature
      );
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * 生成证书内容完整性哈希
   * 将证书核心内容字段编码后哈希，用于链上内容完整性验证
   * 替代空的 IPFS 哈希字段
   */
  static generateContentHash(data: {
    studentId: string;
    universityCode: string;
    companyCode: string;
    position: string;
    department?: string;
    startDate: number;
    endDate: number;
    evaluation?: string;
    certNumber: string;
  }): string {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'string', 'string', 'string', 'uint256', 'uint256', 'string', 'string'],
      [
        data.studentId,
        data.universityCode,
        data.companyCode,
        data.position,
        data.department || '',
        data.startDate,
        data.endDate,
        data.evaluation || '',
        data.certNumber,
      ]
    );
    return ethers.keccak256(encoded);
  }

  /**
   * 获取签名者的以太坊地址（用于验证签名身份）
   */
  static getSignerAddress(privateKey: string): string {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  }
}

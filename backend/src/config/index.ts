// ==========================================
//! 【后端配置】所有环境变量在这里统一管理
// 部署时通过 Render 后台的环境变量配置
// ==========================================
export const config = {
  //! 【部署】数据库连接 — 部署时使用 Neon Cloud 的连接串
  databaseUrl: process.env.DATABASE_URL || 'mysql://root:123456@localhost:3306/internship_certificate_db',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  //! 【部署】区块链连接 — 部署时使用 Alchemy 的 Sepolia 测试网地址
  blockchainRpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
  // 签名钱包私钥 — 用于发起上链交易
  signerPrivateKey: process.env.SIGNER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  
  // 服务配置
  port: process.env.PORT || 3001,
  
  //! 【部署】前端地址 — 用于生成证书核验链接和二维码
  // 部署时必须设为 Vercel 的地址，否则二维码链接指向 localhost
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // 获取验证URL基础地址 (自动添加 /verify 路径)
  getVerifyBaseUrl: () => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${baseUrl}/verify`;
  },
};

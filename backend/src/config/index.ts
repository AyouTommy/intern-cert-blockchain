// 系统配置
export const config = {
  // 数据库
  databaseUrl: process.env.DATABASE_URL || 'mysql://root:123456@localhost:3306/internship_certificate_db',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // 区块链
  blockchainRpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
  signerPrivateKey: process.env.SIGNER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  
  // 服务配置
  port: process.env.PORT || 3001,
  
  // 前端地址 - 用于生成验证链接
  // 在局域网访问时，需要设置 FRONTEND_URL 为本机IP地址
  // 例如: FRONTEND_URL=http://192.168.1.100:5173
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // 获取验证URL基础地址 (自动添加 /verify 路径)
  getVerifyBaseUrl: () => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${baseUrl}/verify`;
  },
};

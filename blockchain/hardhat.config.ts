import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// ==========================================
//! 【部署配置】区块链网络配置
// 合约部署在 Sepolia 测试网（以太坊公开测试网络）
// 不是本地 Hardhat 节点，是真实的区块链网络
// ==========================================

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    //! 【部署关键】Sepolia 测试网配置
    // 链号 11155111，需要配置环境变量:
    //   SEPOLIA_RPC_URL → 链接地址(从 Alchemy 或 Infura 获取)
    //   PRIVATE_KEY     → 部署钱包的私钥
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

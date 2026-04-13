import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * V2 合约部署脚本
 * 命令: npx hardhat run scripts/deploy-v2.ts --network sepolia
 */
async function main() {
  console.log("🚀 开始部署 InternshipCertificationV2 (Gas优化版)...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 部署账户:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(balance), "ETH\n");

  // 部署 V2
  console.log("📦 正在部署 InternshipCertificationV2...");
  const V2 = await ethers.getContractFactory("InternshipCertificationV2");
  const contract = await V2.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ V2 合约部署成功!");
  console.log("📍 合约地址:", contractAddress);

  const deploymentTx = contract.deploymentTransaction();
  if (deploymentTx) {
    console.log("🔗 交易哈希:", deploymentTx.hash);
    const receipt = await deploymentTx.wait();
    if (receipt) {
      console.log("⛽ Gas使用量:", receipt.gasUsed.toString());
    }
  }

  // 保存部署信息
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    contractAddress: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: deploymentTx?.hash || "",
    version: "V2",
    optimizations: ["C1-StoragePacking", "C3-RemovedArrays"],
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(deploymentsDir, `${deploymentInfo.chainId}-v2.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // 复制 ABI 到后端 (覆盖 V1 的 ABI，因为外部接口兼容)
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/InternshipCertificationV2.sol/InternshipCertificationV2.json"
  );
  const backendAbiDir = path.join(__dirname, "../../backend/src/contracts");

  if (!fs.existsSync(backendAbiDir)) {
    fs.mkdirSync(backendAbiDir, { recursive: true });
  }

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiInfo = {
      address: contractAddress,
      abi: artifact.abi,
      chainId: deploymentInfo.chainId,
      version: "V2",
    };
    fs.writeFileSync(
      path.join(backendAbiDir, "InternshipCertification.json"),
      JSON.stringify(abiInfo, null, 2)
    );
    console.log("📋 V2 ABI 已覆盖后端 InternshipCertification.json");
  }

  console.log("\n🎉 V2 部署完成!\n");
  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });

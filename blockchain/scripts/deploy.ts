import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 开始部署实习证明智能合约...\n");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("📍 部署账户:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(balance), "ETH\n");

  // 部署合约
  console.log("📦 正在部署 InternshipCertification 合约...");
  const InternshipCertification = await ethers.getContractFactory("InternshipCertification");
  const contract = await InternshipCertification.deploy();
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ 合约部署成功!");
  console.log("📍 合约地址:", contractAddress);

  // 获取交易信息
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
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, `${deploymentInfo.chainId}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 部署信息已保存到:", deploymentPath);

  // 复制ABI到后端
  const artifactPath = path.join(__dirname, "../artifacts/contracts/InternshipCertification.sol/InternshipCertification.json");
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
    };
    fs.writeFileSync(
      path.join(backendAbiDir, "InternshipCertification.json"),
      JSON.stringify(abiInfo, null, 2)
    );
    console.log("📋 ABI已复制到后端目录");
  }

  console.log("\n🎉 部署完成!\n");

  // 验证合约（可选）
  if (process.env.ETHERSCAN_API_KEY && deploymentInfo.chainId !== 31337) {
    console.log("🔍 正在验证合约...");
    try {
      await new Promise(resolve => setTimeout(resolve, 30000)); // 等待30秒
      const { run } = await import("hardhat");
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ 合约验证成功!");
    } catch (error: any) {
      console.log("⚠️ 合约验证失败:", error.message);
    }
  }

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });

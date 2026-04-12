import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=== 生成多方确认钱包并转账 Sepolia ETH ===\n");
  console.log("管理员(部署者):", deployer.address);

  // 生成两个新钱包
  const uniWallet = ethers.Wallet.createRandom();
  const compWallet = ethers.Wallet.createRandom();

  console.log("\n🏫 高校钱包:");
  console.log("  地址:", uniWallet.address);
  console.log("  私钥:", uniWallet.privateKey);

  console.log("\n🏢 企业钱包:");
  console.log("  地址:", compWallet.address);
  console.log("  私钥:", compWallet.privateKey);

  // 给两个钱包各转 0.05 ETH
  const amount = ethers.parseEther("0.05");

  console.log("\n💸 给高校钱包转 0.05 ETH...");
  const tx1 = await deployer.sendTransaction({ to: uniWallet.address, value: amount });
  await tx1.wait();
  console.log("   交易:", tx1.hash);

  console.log("💸 给企业钱包转 0.05 ETH...");
  const tx2 = await deployer.sendTransaction({ to: compWallet.address, value: amount });
  await tx2.wait();
  console.log("   交易:", tx2.hash);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("\n✅ 完成! 管理员剩余:", ethers.formatEther(balance), "ETH");

  console.log("\n========= Render 环境变量配置 =========");
  console.log("SIGNER_PRIVATE_KEY=4a998df3b04a451550438abf812c72db4ed2b3e92032a8a2035e1f804c73cb1f");
  console.log("UNIVERSITY_PRIVATE_KEY=" + uniWallet.privateKey.slice(2));
  console.log("COMPANY_PRIVATE_KEY=" + compWallet.privateKey.slice(2));
  console.log("BLOCKCHAIN_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com");
  console.log("CHAIN_ID=11155111");
}

main().catch(console.error);

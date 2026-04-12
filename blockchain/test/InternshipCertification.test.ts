import { expect } from "chai";
import { ethers } from "hardhat";
import { InternshipCertification } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("InternshipCertification", function () {
  let contract: InternshipCertification;
  let admin: SignerWithAddress;
  let university: SignerWithAddress;
  let company: SignerWithAddress;
  let student: SignerWithAddress;
  let verifier: SignerWithAddress;

  const UNIVERSITY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UNIVERSITY_ROLE"));
  const COMPANY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COMPANY_ROLE"));

  beforeEach(async function () {
    [admin, university, company, student, verifier] = await ethers.getSigners();

    const InternshipCertification = await ethers.getContractFactory("InternshipCertification");
    contract = (await InternshipCertification.deploy()) as unknown as InternshipCertification;
    await contract.waitForDeployment();

    // 授予角色
    await contract.grantUniversityRole(university.address, "UNIV001");
    await contract.grantCompanyRole(company.address, "COMP001");
  });

  describe("部署", function () {
    it("应该正确设置管理员角色", async function () {
      const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
      expect(await contract.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("初始统计数据应该为零", async function () {
      const [total, active, revoked] = await contract.getStatistics();
      expect(total).to.equal(0);
      expect(active).to.equal(0);
      expect(revoked).to.equal(0);
    });
  });

  describe("直接创建证明", function () {
    it("高校应该能创建证明", async function () {
      const certHash = ethers.keccak256(ethers.toUtf8Bytes("test-cert-1"));
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 90; // 90天后

      await expect(
        contract.connect(university).createCertificate(
          certHash,
          student.address,
          "STU2024001",
          "UNIV001",
          "COMP001",
          startDate,
          endDate,
          "0xabc123"
        )
      ).to.emit(contract, "CertificateCreated");

      const cert = await contract.getCertificate(certHash);
      expect(cert.studentId).to.equal("STU2024001");
      expect(cert.status).to.equal(1); // Active
      expect(cert.contentHash).to.equal("0xabc123");
    });

    it("企业应该能创建证明", async function () {
      const certHash = ethers.keccak256(ethers.toUtf8Bytes("test-cert-2"));
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 60;

      await contract.connect(company).createCertificate(
        certHash,
        student.address,
        "STU2024002",
        "UNIV001",
        "COMP001",
        startDate,
        endDate,
        "content-hash-test"
      );

      const cert = await contract.getCertificate(certHash);
      expect(cert.contentHash).to.equal("content-hash-test");
    });

    it("未授权用户不能创建证明", async function () {
      const certHash = ethers.keccak256(ethers.toUtf8Bytes("test-cert-3"));
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 30;

      await expect(
        contract.connect(verifier).createCertificate(
          certHash,
          student.address,
          "STU2024003",
          "UNIV001",
          "COMP001",
          startDate,
          endDate,
          ""
        )
      ).to.be.revertedWith("Not authorized to create certificates");
    });

    it("不能创建重复的证明", async function () {
      const certHash = ethers.keccak256(ethers.toUtf8Bytes("duplicate-cert"));
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 30;

      await contract.connect(university).createCertificate(
        certHash,
        student.address,
        "STU2024004",
        "UNIV001",
        "COMP001",
        startDate,
        endDate,
        ""
      );

      await expect(
        contract.connect(university).createCertificate(
          certHash,
          student.address,
          "STU2024004",
          "UNIV001",
          "COMP001",
          startDate,
          endDate,
          ""
        )
      ).to.be.revertedWith("Certificate already exists");
    });
  });

  describe("多方确认机制", function () {
    let certHash: string;
    const startDate = Math.floor(Date.now() / 1000);
    const endDate = startDate + 86400 * 90;

    beforeEach(async function () {
      certHash = ethers.keccak256(ethers.toUtf8Bytes("multi-confirm-test"));
    });

    it("高校提交请求后自动确认高校方", async function () {
      await contract.connect(university).submitCertificateRequest(
        certHash, "STU001", "UNIV001", "COMP001", startDate, endDate, "hash"
      );

      const req = await contract.getRequestStatus(certHash);
      expect(req.universityConfirmed).to.be.true;
      expect(req.companyConfirmed).to.be.false;
      expect(req.finalized).to.be.false;
    });

    it("企业确认后应自动生效", async function () {
      // 高校提交请求（自动确认高校方）
      await contract.connect(university).submitCertificateRequest(
        certHash, "STU001", "UNIV001", "COMP001", startDate, endDate, "hash"
      );

      // 企业确认
      await expect(
        contract.connect(company).companyConfirm(certHash)
      ).to.emit(contract, "CertificateFinalized");

      // 验证证书已生效
      const cert = await contract.getCertificate(certHash);
      expect(cert.status).to.equal(1); // Active
      expect(cert.studentId).to.equal("STU001");
    });

    it("管理员提交后需要高校和企业分别确认", async function () {
      await contract.connect(admin).submitCertificateRequest(
        certHash, "STU001", "UNIV001", "COMP001", startDate, endDate, "hash"
      );

      let req = await contract.getRequestStatus(certHash);
      expect(req.universityConfirmed).to.be.false;
      expect(req.companyConfirmed).to.be.false;

      // 高校确认
      await contract.connect(university).universityConfirm(certHash);
      req = await contract.getRequestStatus(certHash);
      expect(req.universityConfirmed).to.be.true;
      expect(req.finalized).to.be.false;

      // 企业确认 → 自动生效
      await contract.connect(company).companyConfirm(certHash);
      req = await contract.getRequestStatus(certHash);
      expect(req.finalized).to.be.true;

      // 验证证书存在
      const cert = await contract.getCertificate(certHash);
      expect(cert.status).to.equal(1);
    });

    it("未授权的角色不能确认", async function () {
      await contract.connect(university).submitCertificateRequest(
        certHash, "STU001", "UNIV001", "COMP001", startDate, endDate, "hash"
      );

      await expect(
        contract.connect(verifier).companyConfirm(certHash)
      ).to.be.revertedWith("Not company");

      await expect(
        contract.connect(company).universityConfirm(certHash)
      ).to.be.revertedWith("Not university");
    });
  });

  describe("验证证明（view函数，不花Gas）", function () {
    let certHash: string;

    beforeEach(async function () {
      certHash = ethers.keccak256(ethers.toUtf8Bytes("verify-test"));
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 30;

      await contract.connect(university).createCertificate(
        certHash,
        student.address,
        "STU2024005",
        "UNIV001",
        "COMP001",
        startDate,
        endDate,
        "content-hash-verify"
      );
    });

    it("任何人都能验证证明（不花Gas）", async function () {
      const [isValid, cert, isExpired] = await contract.connect(verifier).verifyCertificate(certHash);
      expect(isValid).to.be.true;
      expect(isExpired).to.be.false;
      expect(cert.studentId).to.equal("STU2024005");
    });

    it("已撤销的证明验证应返回false", async function () {
      await contract.connect(university).revokeCertificate(certHash, "测试撤销");
      const [isValid, , isExpired] = await contract.connect(verifier).verifyCertificate(certHash);
      expect(isValid).to.be.false;
      expect(isExpired).to.be.false; // 撤销不算过期
    });

    it("可以单独记录验证日志（花Gas）", async function () {
      await expect(
        contract.connect(verifier).logVerification(certHash)
      ).to.emit(contract, "CertificateVerified");
    });
  });

  describe("过期检测", function () {
    it("正常证书不应该过期", async function () {
      const certHash = ethers.keccak256(ethers.toUtf8Bytes("not-expired"));
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 30;

      await contract.connect(university).createCertificate(
        certHash, student.address, "STU001", "UNIV001", "COMP001",
        startDate, endDate, ""
      );

      expect(await contract.isCertificateExpired(certHash)).to.be.false;
      expect(await contract.isValidCertificate(certHash)).to.be.true;
    });
  });

  describe("内容完整性验证", function () {
    it("应该能验证内容哈希的完整性", async function () {
      const certHash = ethers.keccak256(ethers.toUtf8Bytes("integrity-test"));
      const contentHash = "sha256:abc123def456";
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 30;

      await contract.connect(university).createCertificate(
        certHash, student.address, "STU001", "UNIV001", "COMP001",
        startDate, endDate, contentHash
      );

      // 正确的哈希应该通过验证
      expect(await contract.verifyContentIntegrity(certHash, contentHash)).to.be.true;
      // 错误的哈希应该验证失败
      expect(await contract.verifyContentIntegrity(certHash, "wrong-hash")).to.be.false;
    });
  });

  describe("撤销证明", function () {
    let certHash: string;

    beforeEach(async function () {
      certHash = ethers.keccak256(ethers.toUtf8Bytes("revoke-test"));
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 30;

      await contract.connect(university).createCertificate(
        certHash,
        student.address,
        "STU2024006",
        "UNIV001",
        "COMP001",
        startDate,
        endDate,
        ""
      );
    });

    it("发证方能撤销证明", async function () {
      await expect(
        contract.connect(university).revokeCertificate(certHash, "信息有误")
      ).to.emit(contract, "CertificateRevoked");

      const cert = await contract.getCertificate(certHash);
      expect(cert.status).to.equal(2); // Revoked
    });

    it("管理员能撤销任何证明", async function () {
      await contract.revokeCertificate(certHash, "管理员撤销");
      const cert = await contract.getCertificate(certHash);
      expect(cert.status).to.equal(2);
    });

    it("非发证方不能撤销证明", async function () {
      await expect(
        contract.connect(company).revokeCertificate(certHash, "非法撤销")
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("批量创建", function () {
    it("应该能批量创建证明", async function () {
      const certHashes = [
        ethers.keccak256(ethers.toUtf8Bytes("batch-1")),
        ethers.keccak256(ethers.toUtf8Bytes("batch-2")),
        ethers.keccak256(ethers.toUtf8Bytes("batch-3")),
      ];
      const students = [student.address, student.address, student.address];
      const studentIds = ["STU001", "STU002", "STU003"];
      const startDate = Math.floor(Date.now() / 1000);
      const startDates = [startDate, startDate, startDate];
      const endDates = [startDate + 86400 * 30, startDate + 86400 * 60, startDate + 86400 * 90];

      await contract.connect(university).batchCreateCertificates(
        certHashes,
        students,
        studentIds,
        "UNIV001",
        "COMP001",
        startDates,
        endDates
      );

      const [total] = await contract.getStatistics();
      expect(total).to.equal(3);
    });
  });

  describe("查询功能", function () {
    beforeEach(async function () {
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 30;

      for (let i = 0; i < 3; i++) {
        const certHash = ethers.keccak256(ethers.toUtf8Bytes(`query-test-${i}`));
        await contract.connect(university).createCertificate(
          certHash,
          student.address,
          `STU202400${i}`,
          "UNIV001",
          "COMP001",
          startDate,
          endDate,
          ""
        );
      }
    });

    it("应该能获取学生的所有证明", async function () {
      const certs = await contract.getStudentCertificates(student.address);
      expect(certs.length).to.equal(3);
    });

    it("应该能获取高校的所有证明", async function () {
      const certs = await contract.getUniversityCertificates("UNIV001");
      expect(certs.length).to.equal(3);
    });

    it("应该能分页获取所有证明", async function () {
      const page1 = await contract.getAllCertificateIds(0, 2);
      expect(page1.length).to.equal(2);

      const page2 = await contract.getAllCertificateIds(2, 2);
      expect(page2.length).to.equal(1);
    });
  });

  describe("暂停功能", function () {
    it("管理员能暂停合约", async function () {
      await contract.pause();
      
      const certHash = ethers.keccak256(ethers.toUtf8Bytes("pause-test"));
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 30;

      await expect(
        contract.connect(university).createCertificate(
          certHash,
          student.address,
          "STU2024",
          "UNIV001",
          "COMP001",
          startDate,
          endDate,
          ""
        )
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });

    it("管理员能恢复合约", async function () {
      await contract.pause();
      await contract.unpause();

      const certHash = ethers.keccak256(ethers.toUtf8Bytes("unpause-test"));
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 30;

      await contract.connect(university).createCertificate(
        certHash,
        student.address,
        "STU2024",
        "UNIV001",
        "COMP001",
        startDate,
        endDate,
        ""
      );

      const cert = await contract.getCertificate(certHash);
      expect(cert.status).to.equal(1);
    });
  });

  async function getBlockTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block?.timestamp || 0;
  }
});

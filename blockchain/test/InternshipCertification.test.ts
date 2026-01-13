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
    contract = await InternshipCertification.deploy();
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

  describe("创建证明", function () {
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
          ""
        )
      ).to.emit(contract, "CertificateCreated")
        .withArgs(certHash, university.address, student.address, "STU2024001", await getBlockTimestamp());

      const cert = await contract.getCertificate(certHash);
      expect(cert.studentId).to.equal("STU2024001");
      expect(cert.status).to.equal(1); // Active
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
        "QmTestHash"
      );

      const cert = await contract.getCertificate(certHash);
      expect(cert.ipfsHash).to.equal("QmTestHash");
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

  describe("验证证明", function () {
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
        ""
      );
    });

    it("任何人都能验证证明", async function () {
      const [isValid, cert] = await contract.connect(verifier).verifyCertificate.staticCall(certHash);
      expect(isValid).to.be.true;
      expect(cert.studentId).to.equal("STU2024005");
    });

    it("已撤销的证明验证应返回false", async function () {
      await contract.connect(university).revokeCertificate(certHash, "测试撤销");
      const [isValid] = await contract.connect(verifier).verifyCertificate.staticCall(certHash);
      expect(isValid).to.be.false;
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

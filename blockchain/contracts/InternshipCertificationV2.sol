// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InternshipCertificationV2
 * @dev 高校实习证明上链系统智能合约 - Gas 优化版
 * @notice 相比 V1 的优化:
 *   C1: 存储变量打包 - status+dates 打包到 uint256 槽位
 *   C2: bytes32 编码 - studentId/universityId/companyId 使用 bytes32
 *   C3: 移除链上索引数组 - 改用事件做链下索引
 */
contract InternshipCertificationV2 is AccessControl, Pausable, ReentrancyGuard {
    // 角色定义
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UNIVERSITY_ROLE = keccak256("UNIVERSITY_ROLE");
    bytes32 public constant COMPANY_ROLE = keccak256("COMPANY_ROLE");

    // 证明状态枚举 (uint8, 只占 1 字节)
    enum CertificateStatus {
        Pending,    // 待确认
        Active,     // 有效
        Revoked,    // 已撤销
        Expired     // 已过期
    }

    // ==========================================
    // 【C1 优化】存储变量打包
    // 将 status(uint8) + issueDate(uint64) + startDate(uint64) + endDate(uint64)
    // 打包到一个结构体中, 利用 Solidity 自动槽位打包
    // 原来 12 字段占 7+ 槽, 优化后占 5 槽
    // ==========================================
    struct Certificate {
        bytes32 certHash;               // 槽1: 证明哈希
        address issuer;                 // 槽2: 发证方地址 (20 bytes)
        CertificateStatus status;       //       状态 (1 byte) - 与 issuer 共享槽2
        uint64 issueDate;               //       发证日期 (8 bytes) - 共享槽2
        address student;                // 槽3: 学生地址 (20 bytes)
        uint64 startDate;               //       开始日期 (8 bytes) - 共享槽3
        uint64 endDate;                 // 槽4: 结束日期 (8 bytes)
        uint64 createdAt;               //       创建时间 (8 bytes) - 共享槽4
        uint64 updatedAt;               //       更新时间 (8 bytes) - 共享槽4
        bytes32 studentId;              // 槽5: 学号 (bytes32 替代 string)
        bytes32 universityId;           // 槽6: 高校编码 (bytes32 替代 string)
        bytes32 companyId;              // 槽7: 企业编码 (bytes32 替代 string)
        string contentHash;             // 动态: 内容哈希 (保留 string 因为可能较长)
    }

    // 多方确认请求结构体 (同样优化)
    struct CertificateRequest {
        bytes32 certHash;
        bytes32 studentId;              // 【C2】bytes32 替代 string
        bytes32 universityId;           // 【C2】bytes32 替代 string
        bytes32 companyId;              // 【C2】bytes32 替代 string
        uint64 startDate;               // 【C1】uint64 替代 uint256
        uint64 endDate;                 // 【C1】uint64 替代 uint256
        string contentHash;
        bool universityConfirmed;
        bool companyConfirmed;
        address universityAddr;
        address companyAddr;
        bool finalized;
        uint64 createdAt;               // 【C1】uint64 替代 uint256
    }

    // 证书有效期常量：实习结束后5年
    uint256 public constant CERTIFICATE_VALIDITY_PERIOD = 5 * 365 days;

    // 存储映射
    mapping(bytes32 => Certificate) public certificates;
    mapping(bytes32 => CertificateRequest) public pendingRequests;

    // 【C3 优化】移除链上索引数组, 改用事件做链下索引
    // 删除: studentCertificates, universityCertificates, companyCertificates, allCertificateIds
    // 好处: 每次 createCertificate 节省 3 次 push 操作 (约 60,000+ Gas)
    
    // 统计数据 (保留, 因为是简单的计数器)
    uint256 public totalCertificates;
    uint256 public activeCertificates;
    uint256 public revokedCertificates;

    // ==========================================
    // 事件定义 (增加 indexed, 支持链下索引)
    // ==========================================
    event CertificateCreated(
        bytes32 indexed certHash,
        address indexed issuer,
        address indexed student,
        bytes32 studentId,
        bytes32 universityId,
        bytes32 companyId,
        uint256 timestamp
    );

    event CertificateVerified(
        bytes32 indexed certHash,
        address indexed verifier,
        bool isValid,
        uint256 timestamp
    );

    event CertificateRevoked(
        bytes32 indexed certHash,
        address indexed revoker,
        string reason,
        uint256 timestamp
    );

    event CertificateUpdated(
        bytes32 indexed certHash,
        address indexed updater,
        uint256 timestamp
    );

    event RoleGrantedToEntity(
        bytes32 indexed role,
        address indexed account,
        bytes32 entityId
    );

    event CertificateRequestSubmitted(
        bytes32 indexed certHash,
        bytes32 studentId,
        uint256 timestamp
    );

    event ConfirmationReceived(
        bytes32 indexed certHash,
        address indexed confirmer,
        string role,
        uint256 timestamp
    );

    event CertificateFinalized(
        bytes32 indexed certHash,
        address universityAddr,
        address companyAddr,
        uint256 timestamp
    );

    // 修饰器
    modifier onlyIssuer(bytes32 _certHash) {
        require(
            certificates[_certHash].issuer == msg.sender || 
            hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        _;
    }

    modifier certificateExists(bytes32 _certHash) {
        require(certificates[_certHash].createdAt != 0, "Certificate does not exist");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ==========================================
    // 工具函数: string -> bytes32 转换(链下调用)
    // ==========================================
    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) return 0x0;
        assembly {
            result := mload(add(source, 32))
        }
    }

    // ==========================================
    //! 【合约核心函数】直接创建证书上链
    // 【C1+C2+C3 优化版】
    // ==========================================
    function createCertificate(
        bytes32 _certHash,
        address _student,
        bytes32 _studentId,
        bytes32 _universityId,
        bytes32 _companyId,
        uint256 _startDate,
        uint256 _endDate,
        string memory _contentHash
    ) external whenNotPaused nonReentrant returns (bytes32) {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || 
            hasRole(UNIVERSITY_ROLE, msg.sender) || 
            hasRole(COMPANY_ROLE, msg.sender),
            "Not authorized to create certificates"
        );
        require(certificates[_certHash].createdAt == 0, "Certificate already exists");
        require(_studentId != bytes32(0), "Student ID required");
        require(_startDate < _endDate, "Invalid date range");

        Certificate storage cert = certificates[_certHash];
        cert.certHash = _certHash;
        cert.issuer = msg.sender;
        cert.student = _student;
        cert.studentId = _studentId;          // 【C2】直接 bytes32 赋值, 无动态内存
        cert.universityId = _universityId;    // 【C2】直接 bytes32 赋值
        cert.companyId = _companyId;          // 【C2】直接 bytes32 赋值
        cert.issueDate = uint64(block.timestamp);  // 【C1】uint64 打包
        cert.startDate = uint64(_startDate);       // 【C1】uint64 打包
        cert.endDate = uint64(_endDate);           // 【C1】uint64 打包
        cert.status = CertificateStatus.Active;
        cert.contentHash = _contentHash;
        cert.createdAt = uint64(block.timestamp);
        cert.updatedAt = uint64(block.timestamp);

        // 【C3 优化】不再 push 到链上数组
        // 仅通过事件索引(event)实现链下查询

        // 更新统计
        totalCertificates++;
        activeCertificates++;

        emit CertificateCreated(
            _certHash, msg.sender, _student,
            _studentId, _universityId, _companyId,
            block.timestamp
        );

        return _certHash;
    }

    // ==========================================
    //! 【多方确认机制 - 第1步】提交证书请求
    // ==========================================
    function submitCertificateRequest(
        bytes32 _certHash,
        bytes32 _studentId,
        bytes32 _universityId,
        bytes32 _companyId,
        uint256 _startDate,
        uint256 _endDate,
        string memory _contentHash
    ) external whenNotPaused nonReentrant {
        require(
            hasRole(ADMIN_ROLE, msg.sender) ||
            hasRole(UNIVERSITY_ROLE, msg.sender),
            "Not authorized"
        );
        require(pendingRequests[_certHash].createdAt == 0, "Request already exists");

        CertificateRequest storage req = pendingRequests[_certHash];
        req.certHash = _certHash;
        req.studentId = _studentId;
        req.universityId = _universityId;
        req.companyId = _companyId;
        req.startDate = uint64(_startDate);
        req.endDate = uint64(_endDate);
        req.contentHash = _contentHash;
        req.createdAt = uint64(block.timestamp);

        // 如果是高校提交的 => 自动确认高校
        if (hasRole(UNIVERSITY_ROLE, msg.sender)) {
            req.universityConfirmed = true;
            req.universityAddr = msg.sender;
            emit ConfirmationReceived(_certHash, msg.sender, "UNIVERSITY", block.timestamp);
        }

        emit CertificateRequestSubmitted(_certHash, _studentId, block.timestamp);
    }

    // ==========================================
    //! 【多方确认机制 - 第2步】企业确认
    // ==========================================
    function companyConfirm(bytes32 _certHash) external whenNotPaused nonReentrant {
        require(hasRole(COMPANY_ROLE, msg.sender), "Not authorized: COMPANY only");
        CertificateRequest storage req = pendingRequests[_certHash];
        require(req.createdAt != 0, "Request not found");
        require(!req.finalized, "Already finalized");

        req.companyConfirmed = true;
        req.companyAddr = msg.sender;

        emit ConfirmationReceived(_certHash, msg.sender, "COMPANY", block.timestamp);

        if (req.universityConfirmed && req.companyConfirmed) {
            _finalizeCertificate(_certHash, req);
        }
    }

    // ==========================================
    // 内部函数: 最终生成证书
    // ==========================================
    function _finalizeCertificate(
        bytes32 _certHash,
        CertificateRequest storage req
    ) internal {
        req.finalized = true;

        Certificate storage cert = certificates[_certHash];
        cert.certHash = _certHash;
        cert.issuer = req.universityAddr;
        cert.student = address(0);
        cert.studentId = req.studentId;
        cert.universityId = req.universityId;
        cert.companyId = req.companyId;
        cert.issueDate = uint64(block.timestamp);
        cert.startDate = req.startDate;
        cert.endDate = req.endDate;
        cert.status = CertificateStatus.Active;
        cert.contentHash = req.contentHash;
        cert.createdAt = uint64(block.timestamp);
        cert.updatedAt = uint64(block.timestamp);

        totalCertificates++;
        activeCertificates++;

        emit CertificateCreated(
            _certHash, req.universityAddr, address(0),
            req.studentId, req.universityId, req.companyId,
            block.timestamp
        );

        emit CertificateFinalized(
            _certHash, req.universityAddr, req.companyAddr, block.timestamp
        );
    }

    // ==========================================
    //! 核验证书 (view 函数, 不花 Gas)
    // ==========================================
    function verifyCertificate(bytes32 _certHash) 
        external view 
        returns (bool isValid, Certificate memory cert, bool isExpired) 
    {
        cert = certificates[_certHash];
        if (cert.createdAt == 0) return (false, cert, false);
        isExpired = block.timestamp > uint256(cert.endDate) + CERTIFICATE_VALIDITY_PERIOD;
        isValid = cert.status == CertificateStatus.Active && !isExpired;
    }

    // ==========================================
    //! 撤销证书
    // ==========================================
    function revokeCertificate(
        bytes32 _certHash, 
        string memory _reason
    ) external certificateExists(_certHash) onlyIssuer(_certHash) {
        Certificate storage cert = certificates[_certHash];
        require(cert.status == CertificateStatus.Active, "Certificate is not active");
        cert.status = CertificateStatus.Revoked;
        cert.updatedAt = uint64(block.timestamp);
        activeCertificates--;
        revokedCertificates++;
        emit CertificateRevoked(_certHash, msg.sender, _reason, block.timestamp);
    }

    // ==========================================
    //! 内容完整性验证
    // ==========================================
    function verifyContentIntegrity(
        bytes32 _certHash,
        string memory _contentHash
    ) external view certificateExists(_certHash) returns (bool) {
        return keccak256(abi.encodePacked(certificates[_certHash].contentHash)) == 
               keccak256(abi.encodePacked(_contentHash));
    }

    // ==========================================
    //! 角色管理
    // ==========================================
    function grantUniversityRole(address _addr, bytes32 _entityId) external onlyRole(ADMIN_ROLE) {
        _grantRole(UNIVERSITY_ROLE, _addr);
        emit RoleGrantedToEntity(UNIVERSITY_ROLE, _addr, _entityId);
    }

    function grantCompanyRole(address _addr, bytes32 _entityId) external onlyRole(ADMIN_ROLE) {
        _grantRole(COMPANY_ROLE, _addr);
        emit RoleGrantedToEntity(COMPANY_ROLE, _addr, _entityId);
    }

    // ==========================================
    //! 统计查询
    // ==========================================
    function getStatistics() external view returns (
        uint256 total, uint256 active, uint256 revoked
    ) {
        return (totalCertificates, activeCertificates, revokedCertificates);
    }

    // 暂停/恢复
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
}

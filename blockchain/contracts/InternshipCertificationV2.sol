// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InternshipCertificationV2
 * @dev 高校实习证明上链系统智能合约 - Gas 优化版
 * @notice 相比 V1 的优化 (兼容原有 ABI 接口):
 *   C1: 存储变量打包 - 日期使用 uint64，与 address/status 共享槽位
 *   C3: 移除链上索引数组 - 改用事件 indexed 做链下索引
 *        (每次 createCertificate 节省 ~60,000 Gas)
 *   保留 string 外部接口 - 确保后端零修改升级
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
    // issuer(20) + status(1) + issueDate(8) = 29 bytes → 1 槽
    // student(20) + startDate(8) = 28 bytes → 1 槽
    // endDate(8) + createdAt(8) + updatedAt(8) = 24 bytes → 1 槽
    // ==========================================
    struct Certificate {
        bytes32 certHash;               // 槽1: 证明哈希
        address issuer;                 // 槽2: 发证方 (20B) +
        CertificateStatus status;       //       状态 (1B) +
        uint64 issueDate;               //       发证日期 (8B) = 29B → 共享槽2
        address student;                // 槽3: 学生 (20B) +
        uint64 startDate;               //       开始日期 (8B) = 28B → 共享槽3
        uint64 endDate;                 // 槽4: 结束日期 (8B) +
        uint64 createdAt;               //       创建时间 (8B) +
        uint64 updatedAt;               //       更新时间 (8B) = 24B → 共享槽4
        string studentId;               // 动态: 学号 (保留 string 兼容后端)
        string universityId;            // 动态: 高校编码
        string companyId;               // 动态: 企业编码
        string contentHash;             // 动态: 内容哈希
    }

    // 多方确认请求结构体
    struct CertificateRequest {
        bytes32 certHash;
        string studentId;
        string universityId;
        string companyId;
        uint64 startDate;               // 【C1】uint64 打包
        uint64 endDate;
        string contentHash;
        bool universityConfirmed;
        bool companyConfirmed;
        address universityAddr;
        address companyAddr;
        bool finalized;
        uint64 createdAt;
    }

    // 证书有效期常量：实习结束后5年
    uint256 public constant CERTIFICATE_VALIDITY_PERIOD = 5 * 365 days;

    // 存储映射
    mapping(bytes32 => Certificate) public certificates;
    mapping(bytes32 => CertificateRequest) public pendingRequests;

    // 【C3 优化】移除以下4个链上索引数组:
    //   - studentCertificates: mapping(address => bytes32[])
    //   - universityCertificates: mapping(string => bytes32[])
    //   - companyCertificates: mapping(string => bytes32[])
    //   - allCertificateIds: bytes32[]
    // 省略原因: 每次 push 消耗 ~20,000 Gas (新槽位 SSTORE)
    //           3个 push 合计 ~60,000 Gas，通过事件 indexed 做链下索引替代

    // 统计数据 (保留，仅为简单计数器，Gas 成本极低)
    uint256 public totalCertificates;
    uint256 public activeCertificates;
    uint256 public revokedCertificates;

    // ==========================================
    // 事件定义 (增强 indexed 支持链下索引)
    // ==========================================
    event CertificateCreated(
        bytes32 indexed certHash,
        address indexed issuer,
        address indexed student,
        string studentId,
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
        string entityId
    );

    event CertificateRequestSubmitted(
        bytes32 indexed certHash,
        string studentId,
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
    //! 【合约核心函数】直接创建证书上链
    // 外部接口与 V1 完全兼容，内部存储用 uint64 打包
    // 【C3】不再 push 到任何链上数组
    // ==========================================
    function createCertificate(
        bytes32 _certHash,
        address _student,
        string memory _studentId,
        string memory _universityId,
        string memory _companyId,
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
        require(bytes(_studentId).length > 0, "Student ID required");
        require(_startDate < _endDate, "Invalid date range");

        Certificate storage cert = certificates[_certHash];
        cert.certHash = _certHash;
        cert.issuer = msg.sender;
        cert.student = _student;
        cert.studentId = _studentId;
        cert.universityId = _universityId;
        cert.companyId = _companyId;
        cert.issueDate = uint64(block.timestamp);  // 【C1】uint64 打包
        cert.startDate = uint64(_startDate);
        cert.endDate = uint64(_endDate);
        cert.status = CertificateStatus.Active;
        cert.contentHash = _contentHash;
        cert.createdAt = uint64(block.timestamp);
        cert.updatedAt = uint64(block.timestamp);

        // 【C3】不再 push 到链上数组，通过事件索引
        // 原来每次 createCertificate 需要执行:
        //   studentCertificates[_student].push(_certHash);  // ~20k Gas
        //   universityCertificates[_universityId].push();    // ~20k Gas
        //   companyCertificates[_companyId].push();          // ~20k Gas
        //   allCertificateIds.push(_certHash);               // ~20k Gas
        // 优化后节省: ~60,000 Gas

        totalCertificates++;
        activeCertificates++;

        emit CertificateCreated(_certHash, msg.sender, _student, _studentId, block.timestamp);
        return _certHash;
    }

    // ==========================================
    //! 【多方确认机制 - 第1步】提交证书请求
    // ==========================================
    function submitCertificateRequest(
        bytes32 _certHash,
        string memory _studentId,
        string memory _universityId,
        string memory _companyId,
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

    function _finalizeCertificate(bytes32 _certHash, CertificateRequest storage req) internal {
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

        // 【C3】不 push 到链上数组
        totalCertificates++;
        activeCertificates++;

        emit CertificateCreated(_certHash, req.universityAddr, address(0), req.studentId, block.timestamp);
        emit CertificateFinalized(_certHash, req.universityAddr, req.companyAddr, block.timestamp);
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
    function revokeCertificate(bytes32 _certHash, string memory _reason)
        external certificateExists(_certHash) onlyIssuer(_certHash)
    {
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
    function verifyContentIntegrity(bytes32 _certHash, string memory _contentHash)
        external view certificateExists(_certHash) returns (bool)
    {
        return keccak256(abi.encodePacked(certificates[_certHash].contentHash)) ==
               keccak256(abi.encodePacked(_contentHash));
    }

    // ==========================================
    //! 批量创建多个证书
    // ==========================================
    function batchCreateCertificates(
        bytes32[] memory _certHashes,
        address[] memory _students,
        string[] memory _studentIds,
        string memory _universityId,
        string memory _companyId,
        uint256[] memory _startDates,
        uint256[] memory _endDates
    ) external whenNotPaused nonReentrant {
        require(
            hasRole(ADMIN_ROLE, msg.sender) ||
            hasRole(UNIVERSITY_ROLE, msg.sender),
            "Not authorized"
        );
        require(_certHashes.length == _students.length, "Array length mismatch");
        require(_certHashes.length <= 20, "Max 20 per batch");

        for (uint i = 0; i < _certHashes.length; i++) {
            require(certificates[_certHashes[i]].createdAt == 0, "Duplicate cert");

            Certificate storage cert = certificates[_certHashes[i]];
            cert.certHash = _certHashes[i];
            cert.issuer = msg.sender;
            cert.student = _students[i];
            cert.studentId = _studentIds[i];
            cert.universityId = _universityId;
            cert.companyId = _companyId;
            cert.issueDate = uint64(block.timestamp);
            cert.startDate = uint64(_startDates[i]);
            cert.endDate = uint64(_endDates[i]);
            cert.status = CertificateStatus.Active;
            cert.createdAt = uint64(block.timestamp);
            cert.updatedAt = uint64(block.timestamp);

            totalCertificates++;
            activeCertificates++;

            emit CertificateCreated(_certHashes[i], msg.sender, _students[i], _studentIds[i], block.timestamp);
        }
    }

    // ==========================================
    //! 获取统计数据
    // ==========================================
    function getStatistics() external view returns (uint256 total, uint256 active, uint256 revoked) {
        return (totalCertificates, activeCertificates, revokedCertificates);
    }

    // ==========================================
    //! 角色管理
    // ==========================================
    function grantUniversityRole(address _addr, string memory _entityId) external onlyRole(ADMIN_ROLE) {
        _grantRole(UNIVERSITY_ROLE, _addr);
        emit RoleGrantedToEntity(UNIVERSITY_ROLE, _addr, _entityId);
    }

    function grantCompanyRole(address _addr, string memory _entityId) external onlyRole(ADMIN_ROLE) {
        _grantRole(COMPANY_ROLE, _addr);
        emit RoleGrantedToEntity(COMPANY_ROLE, _addr, _entityId);
    }

    // 暂停/恢复
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
}

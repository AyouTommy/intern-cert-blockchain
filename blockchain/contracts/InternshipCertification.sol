// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InternshipCertification
 * @dev 高校实习证明上链系统智能合约
 * @notice 实现证明的不可篡改存储、多方确认与链上核验
 */
// ==========================================
// 智能合约继承了3个安全组件:
//   AccessControl  → 基于角色的权限控制(管理员/高校/企业)
//   Pausable       → 紧急情况可暂停合约
//   ReentrancyGuard → 防止重入攻击
// ==========================================
contract InternshipCertification is AccessControl, Pausable, ReentrancyGuard {
    // 角色定义
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UNIVERSITY_ROLE = keccak256("UNIVERSITY_ROLE");
    bytes32 public constant COMPANY_ROLE = keccak256("COMPANY_ROLE");

    // 证明状态枚举
    enum CertificateStatus {
        Pending,    // 待确认（多方确认流程中）
        Active,     // 有效
        Revoked,    // 已撤销
        Expired     // 已过期
    }

    // ==========================================
    // 证明结构体 — 链上永久存储的证书数据
    // ==========================================
    struct Certificate {
        bytes32 certHash;           // 证明哈希
        address issuer;             // 发证方地址（高校）
        address student;            // 学生地址
        string studentId;           // 学号
        string universityId;        // 高校编码
        string companyId;           // 企业编码
        uint256 issueDate;          // 发证日期
        uint256 startDate;          // 实习开始日期
        uint256 endDate;            // 实习结束日期
        CertificateStatus status;   // 证明状态
        string contentHash;         // 内容完整性哈希（替代IPFS）
        uint256 createdAt;          // 创建时间戳
        uint256 updatedAt;          // 更新时间戳
    }

    // ==========================================
    // 多方确认请求结构体 — 实现「高校+企业」双方确认机制
    // 提交请求后，需要高校和企业分别用自己的钱包签名确认
    // 双方确认后自动生效，体现区块链的多方共识特性
    // ==========================================
    struct CertificateRequest {
        bytes32 certHash;
        string studentId;
        string universityId;
        string companyId;
        uint256 startDate;
        uint256 endDate;
        string contentHash;
        bool universityConfirmed;   // 高校是否已确认
        bool companyConfirmed;      // 企业是否已确认
        address universityAddr;     // 确认的高校地址
        address companyAddr;        // 确认的企业地址
        bool finalized;             // 是否已最终生效
        uint256 createdAt;
    }

    // 证书有效期常量：实习结束后5年
    uint256 public constant CERTIFICATE_VALIDITY_PERIOD = 5 * 365 days;

    // 存储映射
    mapping(bytes32 => Certificate) public certificates;
    mapping(bytes32 => CertificateRequest) public pendingRequests;
    mapping(address => bytes32[]) public studentCertificates;
    mapping(string => bytes32[]) public universityCertificates;
    mapping(string => bytes32[]) public companyCertificates;
    
    // 证明ID列表
    bytes32[] public allCertificateIds;
    
    // 统计数据
    uint256 public totalCertificates;
    uint256 public activeCertificates;
    uint256 public revokedCertificates;

    // ==========================================
    // 事件定义
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

    // 多方确认相关事件
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

    /**
     * @dev 构造函数
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ==========================================
    //! 【合约核心函数】直接创建证书上链（管理员/快速模式）
    // 后端 blockchain.ts 调用这个函数将证书哈希写入链上
    // 只有管理员/高校/企业角色才能调用
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
        cert.issueDate = block.timestamp;
        cert.startDate = _startDate;
        cert.endDate = _endDate;
        cert.status = CertificateStatus.Active;
        cert.contentHash = _contentHash;
        cert.createdAt = block.timestamp;
        cert.updatedAt = block.timestamp;

        // 更新映射
        studentCertificates[_student].push(_certHash);
        universityCertificates[_universityId].push(_certHash);
        companyCertificates[_companyId].push(_certHash);
        allCertificateIds.push(_certHash);

        // 更新统计
        totalCertificates++;
        activeCertificates++;

        emit CertificateCreated(_certHash, msg.sender, _student, _studentId, block.timestamp);

        return _certHash;
    }

    // ==========================================
    //! 【多方确认机制 - 第1步】提交证书请求
    // 管理员或高校提交证书请求，进入待确认状态
    // 需要高校和企业分别确认后才正式生效
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
            "Only admin or university can submit requests"
        );
        require(pendingRequests[_certHash].createdAt == 0, "Request already exists");
        require(certificates[_certHash].createdAt == 0, "Certificate already exists");
        require(bytes(_studentId).length > 0, "Student ID required");
        require(_startDate < _endDate, "Invalid date range");

        pendingRequests[_certHash] = CertificateRequest({
            certHash: _certHash,
            studentId: _studentId,
            universityId: _universityId,
            companyId: _companyId,
            startDate: _startDate,
            endDate: _endDate,
            contentHash: _contentHash,
            universityConfirmed: false,
            companyConfirmed: false,
            universityAddr: address(0),
            companyAddr: address(0),
            finalized: false,
            createdAt: block.timestamp
        });

        // 如果是高校提交的，自动算作高校已确认
        if (hasRole(UNIVERSITY_ROLE, msg.sender)) {
            pendingRequests[_certHash].universityConfirmed = true;
            pendingRequests[_certHash].universityAddr = msg.sender;
            emit ConfirmationReceived(_certHash, msg.sender, "UNIVERSITY", block.timestamp);
        }

        emit CertificateRequestSubmitted(_certHash, _studentId, block.timestamp);
    }

    // ==========================================
    //! 【多方确认机制 - 第2步】高校确认
    // 高校用自己的钱包地址调用此函数确认证书
    // ==========================================
    function universityConfirm(bytes32 _certHash) external whenNotPaused {
        require(hasRole(UNIVERSITY_ROLE, msg.sender), "Not university");
        CertificateRequest storage req = pendingRequests[_certHash];
        require(req.createdAt != 0, "Request not found");
        require(!req.finalized, "Already finalized");
        require(!req.universityConfirmed, "Already confirmed by university");

        req.universityConfirmed = true;
        req.universityAddr = msg.sender;

        emit ConfirmationReceived(_certHash, msg.sender, "UNIVERSITY", block.timestamp);

        // 如果双方都确认了，自动生效
        if (req.companyConfirmed) {
            _finalizeCertificate(_certHash);
        }
    }

    // ==========================================
    //! 【多方确认机制 - 第3步】企业确认
    // 企业用自己的钱包地址调用此函数确认证书
    // ==========================================
    function companyConfirm(bytes32 _certHash) external whenNotPaused {
        require(hasRole(COMPANY_ROLE, msg.sender), "Not company");
        CertificateRequest storage req = pendingRequests[_certHash];
        require(req.createdAt != 0, "Request not found");
        require(!req.finalized, "Already finalized");
        require(!req.companyConfirmed, "Already confirmed by company");

        req.companyConfirmed = true;
        req.companyAddr = msg.sender;

        emit ConfirmationReceived(_certHash, msg.sender, "COMPANY", block.timestamp);

        // 如果双方都确认了，自动生效
        if (req.universityConfirmed) {
            _finalizeCertificate(_certHash);
        }
    }

    /**
     * @dev 内部函数：双方确认后，正式创建证书
     */
    function _finalizeCertificate(bytes32 _certHash) internal {
        CertificateRequest storage req = pendingRequests[_certHash];
        req.finalized = true;

        // 创建正式证书记录
        Certificate storage cert = certificates[_certHash];
        cert.certHash = _certHash;
        cert.issuer = req.universityAddr;
        cert.student = address(0);
        cert.studentId = req.studentId;
        cert.universityId = req.universityId;
        cert.companyId = req.companyId;
        cert.issueDate = block.timestamp;
        cert.startDate = req.startDate;
        cert.endDate = req.endDate;
        cert.status = CertificateStatus.Active;
        cert.contentHash = req.contentHash;
        cert.createdAt = block.timestamp;
        cert.updatedAt = block.timestamp;

        // 更新索引
        universityCertificates[req.universityId].push(_certHash);
        companyCertificates[req.companyId].push(_certHash);
        allCertificateIds.push(_certHash);

        // 更新统计
        totalCertificates++;
        activeCertificates++;

        emit CertificateFinalized(_certHash, req.universityAddr, req.companyAddr, block.timestamp);
        emit CertificateCreated(_certHash, req.universityAddr, address(0), req.studentId, block.timestamp);
    }

    // ==========================================
    //! 【合约核心函数】验证证书（纯读操作，不花Gas）
    // 任何人都可以调用，用于核验证书真伪
    // 同时返回过期状态，实现真正的状态检测
    // ==========================================
    function verifyCertificate(bytes32 _certHash) 
        external 
        view
        certificateExists(_certHash)
        returns (bool isValid, Certificate memory certificate, bool isExpired) 
    {
        certificate = certificates[_certHash];
        isExpired = _isCertificateExpired(_certHash);
        isValid = certificate.status == CertificateStatus.Active && !isExpired;
        return (isValid, certificate, isExpired);
    }

    /**
     * @dev 记录验证日志（链上留痕，可选调用，需花Gas）
     * @param _certHash 证明哈希
     */
    function logVerification(bytes32 _certHash) 
        external 
        certificateExists(_certHash) 
    {
        bool isValid = certificates[_certHash].status == CertificateStatus.Active 
                       && !_isCertificateExpired(_certHash);
        emit CertificateVerified(_certHash, msg.sender, isValid, block.timestamp);
    }

    /**
     * @dev 查询证明（不触发事件的只读版本）
     * @param _certHash 证明哈希
     */
    function getCertificate(bytes32 _certHash) 
        external 
        view 
        certificateExists(_certHash)
        returns (Certificate memory) 
    {
        return certificates[_certHash];
    }

    /**
     * @dev 获取多方确认请求详情
     * @param _certHash 证明哈希
     */
    function getRequestStatus(bytes32 _certHash) 
        external 
        view 
        returns (CertificateRequest memory) 
    {
        require(pendingRequests[_certHash].createdAt != 0, "Request does not exist");
        return pendingRequests[_certHash];
    }

    // ==========================================
    //! 【过期检测】基于实习结束日期 + 有效期自动判定
    // 证书有效期 = 实习结束日期 + 5年
    // 过期后仍可查询，但验证时返回 isExpired=true
    // ==========================================
    function isCertificateExpired(bytes32 _certHash) 
        external 
        view 
        returns (bool) 
    {
        return _isCertificateExpired(_certHash);
    }

    function _isCertificateExpired(bytes32 _certHash) internal view returns (bool) {
        Certificate storage cert = certificates[_certHash];
        if (cert.createdAt == 0) return false;
        if (cert.status == CertificateStatus.Revoked) return false;
        uint256 expiryDate = cert.endDate + CERTIFICATE_VALIDITY_PERIOD;
        return block.timestamp > expiryDate;
    }

    /**
     * @dev 验证内容完整性 — 对比链上存储的内容哈希
     * @param _certHash 证明哈希
     * @param _contentHash 待验证的内容哈希
     */
    function verifyContentIntegrity(bytes32 _certHash, string memory _contentHash) 
        external 
        view 
        certificateExists(_certHash)
        returns (bool) 
    {
        return keccak256(bytes(certificates[_certHash].contentHash)) == keccak256(bytes(_contentHash));
    }

    /**
     * @dev 撤销证明
     * @param _certHash 证明哈希
     * @param _reason 撤销原因
     */
    // ==========================================
    //! 【合约核心函数】撤销证书
    // 只有原始签发者或管理员才能撤销
    // 撤销后链上状态永久更改，不可恢复
    // ==========================================
    function revokeCertificate(bytes32 _certHash, string memory _reason) 
        external 
        whenNotPaused
        certificateExists(_certHash)
        onlyIssuer(_certHash)
    {
        require(
            certificates[_certHash].status == CertificateStatus.Active,
            "Certificate is not active"
        );

        certificates[_certHash].status = CertificateStatus.Revoked;
        certificates[_certHash].updatedAt = block.timestamp;

        activeCertificates--;
        revokedCertificates++;

        emit CertificateRevoked(_certHash, msg.sender, _reason, block.timestamp);
    }

    /**
     * @dev 更新证明内容哈希
     * @param _certHash 证明哈希
     * @param _contentHash 新的内容哈希
     */
    function updateContentHash(bytes32 _certHash, string memory _contentHash) 
        external 
        whenNotPaused
        certificateExists(_certHash)
        onlyIssuer(_certHash)
    {
        certificates[_certHash].contentHash = _contentHash;
        certificates[_certHash].updatedAt = block.timestamp;

        emit CertificateUpdated(_certHash, msg.sender, block.timestamp);
    }

    /**
     * @dev 获取学生的所有证明
     * @param _student 学生地址
     */
    function getStudentCertificates(address _student) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return studentCertificates[_student];
    }

    /**
     * @dev 获取高校的所有证明
     * @param _universityId 高校编码
     */
    function getUniversityCertificates(string memory _universityId) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return universityCertificates[_universityId];
    }

    /**
     * @dev 获取企业的所有证明
     * @param _companyId 企业编码
     */
    function getCompanyCertificates(string memory _companyId) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return companyCertificates[_companyId];
    }

    /**
     * @dev 获取统计数据
     */
    function getStatistics() 
        external 
        view 
        returns (
            uint256 total,
            uint256 active,
            uint256 revoked
        ) 
    {
        return (totalCertificates, activeCertificates, revokedCertificates);
    }

    /**
     * @dev 批量创建证明
     */
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
            "Not authorized for batch operations"
        );
        require(
            _certHashes.length == _students.length &&
            _students.length == _studentIds.length &&
            _studentIds.length == _startDates.length &&
            _startDates.length == _endDates.length,
            "Array length mismatch"
        );
        require(_certHashes.length <= 50, "Batch size exceeds limit");

        for (uint256 i = 0; i < _certHashes.length; i++) {
            if (certificates[_certHashes[i]].createdAt == 0) {
                Certificate storage cert = certificates[_certHashes[i]];
                cert.certHash = _certHashes[i];
                cert.issuer = msg.sender;
                cert.student = _students[i];
                cert.studentId = _studentIds[i];
                cert.universityId = _universityId;
                cert.companyId = _companyId;
                cert.issueDate = block.timestamp;
                cert.startDate = _startDates[i];
                cert.endDate = _endDates[i];
                cert.status = CertificateStatus.Active;
                cert.createdAt = block.timestamp;
                cert.updatedAt = block.timestamp;

                studentCertificates[_students[i]].push(_certHashes[i]);
                universityCertificates[_universityId].push(_certHashes[i]);
                companyCertificates[_companyId].push(_certHashes[i]);
                allCertificateIds.push(_certHashes[i]);

                totalCertificates++;
                activeCertificates++;

                emit CertificateCreated(
                    _certHashes[i], 
                    msg.sender, 
                    _students[i], 
                    _studentIds[i], 
                    block.timestamp
                );
            }
        }
    }

    /**
     * @dev 授予高校角色
     */
    function grantUniversityRole(address _account, string memory _universityId) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        grantRole(UNIVERSITY_ROLE, _account);
        emit RoleGrantedToEntity(UNIVERSITY_ROLE, _account, _universityId);
    }

    /**
     * @dev 授予企业角色
     */
    function grantCompanyRole(address _account, string memory _companyId) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        grantRole(COMPANY_ROLE, _account);
        emit RoleGrantedToEntity(COMPANY_ROLE, _account, _companyId);
    }

    /**
     * @dev 暂停合约
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev 恢复合约
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev 获取所有证明ID（分页）
     */
    function getAllCertificateIds(uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        if (_offset >= allCertificateIds.length) {
            return new bytes32[](0);
        }

        uint256 end = _offset + _limit;
        if (end > allCertificateIds.length) {
            end = allCertificateIds.length;
        }

        bytes32[] memory result = new bytes32[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = allCertificateIds[i];
        }

        return result;
    }

    /**
     * @dev 检查证明是否存在且有效（考虑过期）
     * @param _certHash 证明哈希
     */
    function isValidCertificate(bytes32 _certHash) external view returns (bool) {
        return certificates[_certHash].createdAt != 0 && 
               certificates[_certHash].status == CertificateStatus.Active &&
               !_isCertificateExpired(_certHash);
    }
}

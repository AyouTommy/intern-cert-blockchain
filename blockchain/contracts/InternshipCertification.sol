// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InternshipCertification
 * @dev 高校实习证明上链系统智能合约
 * @notice 实现证明的不可篡改存储与链上核验
 */
contract InternshipCertification is AccessControl, Pausable, ReentrancyGuard {
    // 角色定义
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UNIVERSITY_ROLE = keccak256("UNIVERSITY_ROLE");
    bytes32 public constant COMPANY_ROLE = keccak256("COMPANY_ROLE");

    // 证明状态枚举
    enum CertificateStatus {
        Pending,    // 待确认
        Active,     // 有效
        Revoked,    // 已撤销
        Expired     // 已过期
    }

    // 证明结构体
    struct Certificate {
        bytes32 certHash;           // 证明哈希
        address issuer;             // 发证方地址
        address student;            // 学生地址
        string studentId;           // 学号
        string universityId;        // 高校编码
        string companyId;           // 企业编码
        uint256 issueDate;          // 发证日期
        uint256 startDate;          // 实习开始日期
        uint256 endDate;            // 实习结束日期
        CertificateStatus status;   // 证明状态
        string ipfsHash;            // IPFS存储哈希（可选）
        uint256 createdAt;          // 创建时间戳
        uint256 updatedAt;          // 更新时间戳
    }

    // 存储映射
    mapping(bytes32 => Certificate) public certificates;
    mapping(address => bytes32[]) public studentCertificates;
    mapping(string => bytes32[]) public universityCertificates;
    mapping(string => bytes32[]) public companyCertificates;
    
    // 证明ID列表
    bytes32[] public allCertificateIds;
    
    // 统计数据
    uint256 public totalCertificates;
    uint256 public activeCertificates;
    uint256 public revokedCertificates;

    // 事件定义
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

    /**
     * @dev 创建实习证明
     * @param _certHash 证明内容哈希
     * @param _student 学生地址
     * @param _studentId 学号
     * @param _universityId 高校编码
     * @param _companyId 企业编码
     * @param _startDate 实习开始日期
     * @param _endDate 实习结束日期
     * @param _ipfsHash IPFS哈希（可选）
     */
    function createCertificate(
        bytes32 _certHash,
        address _student,
        string memory _studentId,
        string memory _universityId,
        string memory _companyId,
        uint256 _startDate,
        uint256 _endDate,
        string memory _ipfsHash
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
        cert.ipfsHash = _ipfsHash;
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

    /**
     * @dev 验证证明
     * @param _certHash 证明哈希
     * @return isValid 是否有效
     * @return certificate 证明详情
     */
    function verifyCertificate(bytes32 _certHash) 
        external 
        certificateExists(_certHash)
        returns (bool isValid, Certificate memory certificate) 
    {
        certificate = certificates[_certHash];
        isValid = certificate.status == CertificateStatus.Active;

        emit CertificateVerified(_certHash, msg.sender, isValid, block.timestamp);

        return (isValid, certificate);
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
     * @dev 撤销证明
     * @param _certHash 证明哈希
     * @param _reason 撤销原因
     */
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
     * @dev 更新证明IPFS哈希
     * @param _certHash 证明哈希
     * @param _ipfsHash 新的IPFS哈希
     */
    function updateIpfsHash(bytes32 _certHash, string memory _ipfsHash) 
        external 
        whenNotPaused
        certificateExists(_certHash)
        onlyIssuer(_certHash)
    {
        certificates[_certHash].ipfsHash = _ipfsHash;
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
     * @param _certHashes 证明哈希数组
     * @param _students 学生地址数组
     * @param _studentIds 学号数组
     * @param _universityId 高校编码
     * @param _companyId 企业编码
     * @param _startDates 开始日期数组
     * @param _endDates 结束日期数组
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
     * @param _account 账户地址
     * @param _universityId 高校编码
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
     * @param _account 账户地址
     * @param _companyId 企业编码
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
     * @param _offset 偏移量
     * @param _limit 限制数量
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
     * @dev 检查证明是否存在且有效
     * @param _certHash 证明哈希
     */
    function isValidCertificate(bytes32 _certHash) external view returns (bool) {
        return certificates[_certHash].createdAt != 0 && 
               certificates[_certHash].status == CertificateStatus.Active;
    }
}

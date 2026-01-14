import { format } from 'date-fns'
import { QRCodeSVG } from 'qrcode.react'

interface CertificatePreviewProps {
    certificate: {
        id: string
        certNumber: string
        status: string
        position: string
        department?: string
        startDate: string
        endDate: string
        description?: string
        issuedAt?: string
        createdAt: string
        certHash?: string
        txHash?: string
        blockNumber?: number
        chainId?: string | number
        verifyCode: string
        verifyUrl?: string
        student: {
            studentId: string
            user: { name: string }
        }
        university: { name: string; code: string }
        company: { name: string; code: string }
    }
}

export default function CertificatePreview({ certificate }: CertificatePreviewProps) {
    const verifyUrl = certificate.verifyUrl || `${window.location.origin}/verify/${certificate.verifyCode}`

    // 学号脱敏
    const maskedStudentId = certificate.student.studentId.length > 5
        ? `${certificate.student.studentId.slice(0, 3)}****${certificate.student.studentId.slice(-2)}`
        : certificate.student.studentId

    // 哈希缩短显示
    const shortHash = (hash: string) =>
        hash.length > 20 ? `${hash.slice(0, 10)}...${hash.slice(-10)}` : hash

    return (
        <div className="certificate-preview bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden"
            style={{
                width: '100%',
                maxWidth: '595px', // A4 比例
                aspectRatio: '1 / 1.414',
                fontFamily: "'Noto Sans SC', 'Microsoft YaHei', sans-serif"
            }}>
            {/* 内容区域 */}
            <div className="p-6 h-full flex flex-col" style={{ fontSize: '11px' }}>

                {/* 顶部：高校名称 */}
                <div className="text-center mb-4">
                    <h2 className="text-lg font-semibold text-blue-800">
                        {certificate.university.name}
                    </h2>
                </div>

                {/* 主标题 */}
                <div className="text-center mb-1">
                    <h1 className="text-2xl font-bold tracking-widest text-gray-800">
                        实 习 证 明
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">INTERNSHIP CERTIFICATE</p>
                </div>

                {/* 分隔线 */}
                <div className="border-t-2 border-blue-200 my-3" />

                {/* 证书编号 */}
                <div className="text-right text-xs text-gray-500 mb-3">
                    证书编号: {certificate.certNumber}
                </div>

                {/* 学生信息 */}
                <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-blue-500 rounded" />
                        <span className="font-semibold text-blue-700">学生信息</span>
                    </div>
                    <div className="pl-4 space-y-1 text-gray-700">
                        <p>姓    名: <span className="font-medium">{certificate.student.user.name}</span></p>
                        <p>学    号: <span className="font-mono">{maskedStudentId}</span></p>
                    </div>
                </div>

                {/* 实习信息 */}
                <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-blue-500 rounded" />
                        <span className="font-semibold text-blue-700">实习信息</span>
                    </div>
                    <div className="pl-4 space-y-1 text-gray-700">
                        <p>实习单位: <span className="font-medium">{certificate.company.name}</span></p>
                        <p>实习岗位: <span className="font-medium">{certificate.position}</span></p>
                        {certificate.department && (
                            <p>所属部门: {certificate.department}</p>
                        )}
                        <p>实习时间: {format(new Date(certificate.startDate), 'yyyy年MM月dd日')} 至 {format(new Date(certificate.endDate), 'yyyy年MM月dd日')}</p>
                    </div>
                </div>

                {/* 实习描述 */}
                {certificate.description && (
                    <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 bg-blue-500 rounded" />
                            <span className="font-semibold text-blue-700">工作内容</span>
                        </div>
                        <p className="pl-4 text-gray-600 text-xs leading-relaxed">
                            {certificate.description}
                        </p>
                    </div>
                )}

                {/* 确认主体 */}
                <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-blue-500 rounded" />
                        <span className="font-semibold text-blue-700">确认主体</span>
                    </div>
                    <div className="pl-4 space-y-1 text-gray-700">
                        <p>发证高校: {certificate.university.name}</p>
                        <p>实习单位: {certificate.company.name}</p>
                        <p>签发日期: {format(new Date(certificate.issuedAt || certificate.createdAt), 'yyyy年MM月dd日')}</p>
                    </div>
                </div>

                {/* 核验信息 + 二维码 */}
                <div className="flex items-start gap-4 mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 bg-blue-500 rounded" />
                            <span className="font-semibold text-blue-700">核验信息</span>
                        </div>
                        <p className="pl-4 text-xs text-gray-600 break-all">
                            扫描右侧二维码或访问验证链接核验真伪
                        </p>
                        <p className="pl-4 text-xs text-blue-600 mt-1 break-all">
                            {verifyUrl}
                        </p>
                    </div>
                    <div className="flex-shrink-0 p-2 bg-white border border-gray-200 rounded">
                        <QRCodeSVG value={verifyUrl} size={70} level="M" />
                    </div>
                </div>

                {/* 区块链存证信息 */}
                {certificate.certHash && certificate.status === 'ACTIVE' && (
                    <div className="mt-auto pt-3 border-t border-gray-200">
                        <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-xs font-semibold text-blue-700">区块链存证 ✓ 已上链</span>
                            </div>
                            <div className="font-mono text-xs text-gray-600 space-y-1">
                                <p>Cert Hash: {shortHash(certificate.certHash)}</p>
                                {certificate.txHash && (
                                    <p>Tx Hash: {shortHash(certificate.txHash)}</p>
                                )}
                                <div className="flex gap-4">
                                    <span>Block: #{certificate.blockNumber?.toLocaleString()}</span>
                                    <span>Chain ID: {certificate.chainId}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 页脚 */}
                <div className="mt-auto pt-2 text-center text-xs text-gray-400 border-t border-gray-100">
                    <p>本证明由「链证通」区块链实习证明上链系统生成</p>
                    <p>信息已永久存储于区块链，如有争议以链上记录为准</p>
                </div>
            </div>
        </div>
    )
}

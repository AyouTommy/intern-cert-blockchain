import { format } from 'date-fns'
import { QRCodeSVG } from 'qrcode.react'

interface PublicCertificatePreviewProps {
    data: {
        id: string
        certNumber: string
        status: string
        studentName: string
        studentId?: string
        position: string
        department?: string
        startDate: string
        endDate: string
        issuedAt?: string
        description?: string
        university: { name: string }
        company: { name: string }
        blockchain?: {
            certHash: string
            txHash?: string
            blockNumber?: number
            chainId?: number
        }
    }
    verifyUrl?: string
}

export default function PublicCertificatePreview({ data, verifyUrl }: PublicCertificatePreviewProps) {
    const currentVerifyUrl = verifyUrl || window.location.href

    return (
        <div
            className="certificate-card relative overflow-hidden"
            style={{
                width: '100%',
                maxWidth: '520px',
                aspectRatio: '1 / 1.3',
                background: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 50%, #e0e7ff 100%)',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(99, 102, 241, 0.15), 0 8px 24px rgba(0, 0, 0, 0.08)',
                fontFamily: "'Noto Sans SC', 'Microsoft YaHei', system-ui, sans-serif",
            }}
        >
            {/* 装饰性边框 */}
            <div
                className="absolute inset-3 rounded-xl pointer-events-none"
                style={{
                    border: '2px solid rgba(99, 102, 241, 0.2)',
                    background: 'transparent',
                }}
            />

            {/* 角落装饰 */}
            <div className="absolute top-6 left-6 w-8 h-8 border-l-3 border-t-3 border-indigo-400 rounded-tl-lg" style={{ borderWidth: '3px' }} />
            <div className="absolute top-6 right-6 w-8 h-8 border-r-3 border-t-3 border-indigo-400 rounded-tr-lg" style={{ borderWidth: '3px' }} />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-l-3 border-b-3 border-indigo-400 rounded-bl-lg" style={{ borderWidth: '3px' }} />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-r-3 border-b-3 border-indigo-400 rounded-br-lg" style={{ borderWidth: '3px' }} />

            {/* 内容区域 */}
            <div className="relative h-full flex flex-col px-8 py-6">

                {/* 顶部标识 */}
                <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 rounded-full mb-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-indigo-600">区块链认证证书</span>
                    </div>
                    <h2 className="text-sm text-indigo-600/80 tracking-wider">
                        {data.university.name}
                    </h2>
                </div>

                {/* 主标题 */}
                <div className="text-center mb-5">
                    <h1
                        className="text-3xl font-bold tracking-[0.3em] mb-1"
                        style={{
                            background: 'linear-gradient(135deg, #3730a3 0%, #6366f1 50%, #818cf8 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        实习证明
                    </h1>
                    <p className="text-xs text-gray-400 tracking-widest">INTERNSHIP CERTIFICATE</p>
                </div>

                {/* 金色分隔线 */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                    <div className="w-2 h-2 bg-amber-400 rounded-full" />
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                </div>

                {/* 核心信息 - 简化版 */}
                <div className="text-center mb-4 space-y-2">
                    <p className="text-lg font-semibold text-gray-800">
                        {data.studentName}
                    </p>
                    <p className="text-sm text-gray-600">
                        于 {format(new Date(data.startDate), 'yyyy.MM.dd')} - {format(new Date(data.endDate), 'yyyy.MM.dd')}
                    </p>
                    <p className="text-sm text-gray-600">
                        在 <span className="font-medium text-indigo-600">{data.company.name}</span> 完成实习
                    </p>
                    <p className="text-sm text-gray-500">
                        岗位: {data.position}
                    </p>
                </div>

                {/* 证书编号 */}
                <div className="text-center mb-4">
                    <span className="inline-block px-4 py-1.5 bg-white/60 rounded-lg text-xs font-mono text-gray-500 border border-gray-200">
                        NO. {data.certNumber}
                    </span>
                </div>

                {/* 分隔线 */}
                <div className="flex-1" />

                {/* 区块链存证信息 - 完整保留 */}
                {data.blockchain && data.status === 'ACTIVE' && (
                    <div
                        className="rounded-xl p-4 mb-4"
                        style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-sm font-semibold text-indigo-700">区块链存证 ✓ 已上链</span>
                        </div>
                        <div className="font-mono text-xs text-gray-600 space-y-1.5">
                            <div className="flex">
                                <span className="text-gray-400 w-20 flex-shrink-0">Cert Hash:</span>
                                <span className="text-indigo-600 break-all">{data.blockchain.certHash}</span>
                            </div>
                            {data.blockchain.txHash && (
                                <div className="flex">
                                    <span className="text-gray-400 w-20 flex-shrink-0">Tx Hash:</span>
                                    <span className="text-indigo-600 break-all">{data.blockchain.txHash}</span>
                                </div>
                            )}
                            <div className="flex gap-6 mt-2 pt-2 border-t border-indigo-100">
                                <span>
                                    <span className="text-gray-400">Block: </span>
                                    <span className="font-semibold text-gray-700">#{data.blockchain.blockNumber?.toLocaleString()}</span>
                                </span>
                                <span>
                                    <span className="text-gray-400">Chain ID: </span>
                                    <span className="font-semibold text-gray-700">{data.blockchain.chainId}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 二维码和验证链接 - 完整保留 */}
                <div
                    className="flex items-center gap-4 rounded-xl p-3"
                    style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        border: '1px solid rgba(99, 102, 241, 0.15)',
                    }}
                >
                    <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                        <QRCodeSVG
                            value={currentVerifyUrl}
                            size={72}
                            level="M"
                            fgColor="#4f46e5"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 mb-1">扫码验证证书真伪</p>
                        <p className="text-xs text-indigo-600 break-all leading-relaxed">
                            {currentVerifyUrl}
                        </p>
                    </div>
                </div>

                {/* 页脚 */}
                <div className="text-center mt-4 pt-3 border-t border-indigo-100/50">
                    <p className="text-xs text-gray-400">
                        链证通 · 区块链实习证明系统
                    </p>
                </div>
            </div>
        </div>
    )
}

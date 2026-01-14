import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  ShieldCheckIcon,
  CubeIcon,
  ArrowUpOnSquareIcon,
  XCircleIcon,
  ShareIcon,
  QrCodeIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import api, { Certificate } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import clsx from 'clsx'
import CertificatePreview from '../components/CertificatePreview'

const statusConfig: Record<string, { label: string; class: string; color: string }> = {
  PENDING: { label: '待上链', class: 'badge-warning', color: '#f59e0b' },
  PROCESSING: { label: '处理中', class: 'badge-info', color: '#0ea5e9' },
  ACTIVE: { label: '已上链', class: 'badge-success', color: '#10b981' },
  REVOKED: { label: '已撤销', class: 'badge-error', color: '#ef4444' },
  EXPIRED: { label: '已过期', class: 'badge-neutral', color: '#64748b' },
  FAILED: { label: '上链失败', class: 'badge-error', color: '#ef4444' },
}

export default function CertificateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [revokeModal, setRevokeModal] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const { user } = useAuthStore()

  useEffect(() => {
    if (id) {
      fetchCertificate()
    }
  }, [id])

  const fetchCertificate = async () => {
    try {
      const response = await api.get(`/certificates/${id}`)
      setCertificate(response.data.data)
    } catch (error) {
      console.error('Failed to fetch certificate:', error)
      navigate('/certificates')
    } finally {
      setLoading(false)
    }
  }

  const handleUpchain = async () => {
    setActionLoading(true)
    try {
      await api.post(`/certificates/${id}/upchain`)
      toast.success('上链请求已提交')
      fetchCertificate()
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeReason.trim()) {
      toast.error('请输入撤销原因')
      return
    }

    setActionLoading(true)
    try {
      await api.post(`/certificates/${id}/revoke`, { reason: revokeReason })
      toast.success('证明已撤销')
      setRevokeModal(false)
      fetchCertificate()
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setActionLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label}已复制`)
  }

  // PDF下载函数 - 直接使用fetch和Blob下载
  const downloadPdf = async () => {
    if (!certificate) return

    const loadingToast = toast.loading('正在生成PDF...')
    try {
      // 直接构建完整URL使用fetch
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const pdfUrl = `${baseUrl}/certificates/${certificate.id}/pdf`

      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()

      // 创建下载文件名
      const studentName = certificate.student.user.name
      const studentId = certificate.student.studentId
      const fileName = `${studentName}_${studentId}_实习证书.pdf`

      // 使用FileSaver逻辑
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.style.display = 'none'
      link.href = blobUrl
      link.setAttribute('download', fileName)

      // 必须添加到DOM中才能触发下载
      document.body.appendChild(link)
      link.click()

      // 清理
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      }, 100)

      toast.success('PDF下载成功', { id: loadingToast })
    } catch (error) {
      console.error('PDF下载失败:', error)
      toast.error('PDF下载失败，请稍后重试', { id: loadingToast })
    }
  }

  const canManage = user?.role === 'ADMIN' || user?.role === 'UNIVERSITY'

  if (loading) {
    return <CertificateDetailSkeleton />
  }

  if (!certificate) {
    return null
  }

  const verifyUrl = certificate.verifyUrl || `${window.location.origin}/verify/${certificate.verifyCode}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="page-title">{certificate.certNumber}</h1>
            <span className={statusConfig[certificate.status]?.class}>
              {statusConfig[certificate.status]?.label}
            </span>
          </div>
          <p className="page-subtitle">
            创建于 {format(new Date(certificate.createdAt), 'yyyy年MM月dd日 HH:mm')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {(certificate.status === 'PENDING' || certificate.status === 'FAILED') && canManage && (
            <button
              onClick={handleUpchain}
              disabled={actionLoading}
              className="btn-primary flex items-center gap-2"
            >
              <ArrowUpOnSquareIcon className="w-5 h-5" />
              上链
            </button>
          )}
          {certificate.status === 'ACTIVE' && canManage && (
            <button
              onClick={() => setRevokeModal(true)}
              className="btn-danger flex items-center gap-2"
            >
              <XCircleIcon className="w-5 h-5" />
              撤销
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student & Company Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Student */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-primary-500/10">
                  <DocumentTextIcon className="w-6 h-6 text-primary-400" />
                </div>
                <h2 className="card-title">学生信息</h2>
              </div>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-dark-400">姓名</dt>
                  <dd className="text-dark-100 font-medium">{certificate.student.user.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-dark-400">学号</dt>
                  <dd className="text-dark-100">{certificate.student.studentId}</dd>
                </div>
              </dl>
            </motion.div>

            {/* Internship Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <CalendarIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="card-title">实习信息</h2>
              </div>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-dark-400">岗位</dt>
                  <dd className="text-dark-100 font-medium">{certificate.position}</dd>
                </div>
                {certificate.department && (
                  <div className="flex justify-between">
                    <dt className="text-dark-400">部门</dt>
                    <dd className="text-dark-100">{certificate.department}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-dark-400">时间</dt>
                  <dd className="text-dark-100 text-sm">
                    {format(new Date(certificate.startDate), 'yyyy/MM/dd')} - {format(new Date(certificate.endDate), 'yyyy/MM/dd')}
                  </dd>
                </div>
              </dl>
            </motion.div>
          </div>

          {/* University & Company */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <BuildingOfficeIcon className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="card-title">发证高校</h2>
              </div>
              <p className="text-lg text-dark-100 font-medium">{certificate.university.name}</p>
              <p className="text-sm text-dark-400 mt-1">编码：{certificate.university.code}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <BuildingOffice2Icon className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="card-title">实习企业</h2>
              </div>
              <p className="text-lg text-dark-100 font-medium">{certificate.company.name}</p>
              <p className="text-sm text-dark-400 mt-1">编码：{certificate.company.code}</p>
            </motion.div>
          </div>

          {/* Description */}
          {certificate.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-6"
            >
              <h2 className="card-title mb-4">实习描述</h2>
              <p className="text-dark-300 leading-relaxed">{certificate.description}</p>
            </motion.div>
          )}

          {/* Blockchain Info */}
          {certificate.certHash && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20">
                  <CubeIcon className="w-6 h-6 text-primary-400" />
                </div>
                <h2 className="card-title">区块链信息</h2>
                <div className="flex items-center gap-2 text-sm text-emerald-400 ml-auto">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  已上链
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-dark-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-dark-400">证明哈希</span>
                    <button
                      onClick={() => copyToClipboard(certificate.certHash!, '哈希')}
                      className="text-primary-400 hover:text-primary-300"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="blockchain-hash">{certificate.certHash}</p>
                </div>

                {certificate.txHash && (
                  <div className="p-4 rounded-xl bg-dark-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-dark-400">交易哈希</span>
                      <button
                        onClick={() => copyToClipboard(certificate.txHash!, '交易哈希')}
                        className="text-primary-400 hover:text-primary-300"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="blockchain-hash">{certificate.txHash}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-dark-800/50">
                    <span className="text-sm text-dark-400">区块高度</span>
                    <p className="text-lg font-mono text-dark-100 mt-1">
                      #{certificate.blockNumber?.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-dark-800/50">
                    <span className="text-sm text-dark-400">链ID</span>
                    <p className="text-lg font-mono text-dark-100 mt-1">
                      {certificate.chainId}
                    </p>
                  </div>
                </div>

                {/* 区块链浏览器链接 */}
                {certificate.txHash && (
                  <a
                    href={`https://${certificate.chainId === 11155111 ? 'sepolia.' : ''}etherscan.io/tx/${certificate.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20 text-primary-400 hover:text-primary-300 hover:border-primary-500/40 transition-all"
                  >
                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                    <span>在 Etherscan 上查看完整交易信息</span>
                  </a>
                )}
              </div>
            </motion.div>
          )}

          {/* PDF Certificate File - 动态生成 */}
          {certificate.status === 'ACTIVE' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <DocumentTextIcon className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="card-title">证书文件</h2>
              </div>

              {/* 证书预览 - A4纸样式 */}
              <div className="flex justify-center mb-4 overflow-auto">
                <CertificatePreview certificate={certificate as any} />
              </div>

              {/* 下载按钮 */}
              <button
                onClick={downloadPdf}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ArrowUpOnSquareIcon className="w-5 h-5 rotate-180" />
                下载PDF证书
              </button>

              <p className="text-center text-sm text-dark-400 mt-3">
                点击上方按钮下载完整PDF文件，包含区块链存证信息
              </p>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-accent-500/10">
                <QrCodeIcon className="w-6 h-6 text-accent-400" />
              </div>
              <h2 className="card-title">核验二维码</h2>
            </div>
            <div className="flex justify-center p-4 bg-surface rounded-xl">
              <QRCodeSVG
                value={verifyUrl}
                size={180}
                level="H"
                includeMargin
                fgColor="#1a1a2e"
              />
            </div>
            <p className="text-center text-sm text-dark-400 mt-4">
              扫描二维码验证证明真伪
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => copyToClipboard(verifyUrl, '验证链接')}
                className="w-full btn-secondary flex items-center justify-center gap-2"
              >
                <ShareIcon className="w-4 h-4" />
                复制验证链接
              </button>
              <button
                onClick={() => copyToClipboard(certificate.verifyCode, '验证码')}
                className="w-full btn-ghost text-sm"
              >
                验证码：{certificate.verifyCode}
              </button>
            </div>
          </motion.div>

          {/* Status Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <ShieldCheckIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="card-title">状态追踪</h2>
            </div>
            <div className="space-y-4">
              {/* 证明创建 */}
              <TimelineItem
                title="证明创建"
                time={format(new Date(certificate.createdAt), 'yyyy/MM/dd HH:mm')}
                status="completed"
              />

              {/* 企业评价 - 如果有评价或evaluatedAt */}
              {(certificate.evaluation || certificate.evaluatedAt) && (
                <TimelineItem
                  title="企业评价"
                  time={certificate.evaluatedAt
                    ? format(new Date(certificate.evaluatedAt), 'yyyy/MM/dd HH:mm')
                    : '已完成'}
                  status="completed"
                />
              )}

              {/* 高校审核 - 如果状态不是PENDING说明已审核 */}
              {certificate.status !== 'PENDING' && (
                <TimelineItem
                  title="高校审核"
                  time={certificate.approvedAt
                    ? format(new Date(certificate.approvedAt), 'yyyy/MM/dd HH:mm')
                    : certificate.issuedAt
                      ? format(new Date(certificate.issuedAt), 'yyyy/MM/dd HH:mm')
                      : '已完成'}
                  status="completed"
                />
              )}

              {/* 区块链上链 */}
              {certificate.issuedAt && (
                <TimelineItem
                  title="区块链上链"
                  time={format(new Date(certificate.issuedAt), 'yyyy/MM/dd HH:mm')}
                  status="completed"
                />
              )}

              {/* 证明核验 - 显示最近核验 */}
              {certificate.verifications && certificate.verifications.length > 0 && (
                <TimelineItem
                  title={`证明核验 (共${certificate.verifications.length}次)`}
                  time={`最近: ${format(new Date(certificate.verifications[0].createdAt), 'yyyy/MM/dd HH:mm')}`}
                  status="completed"
                />
              )}

              {/* 证明撤销 */}
              {certificate.status === 'REVOKED' && (
                <TimelineItem
                  title="证明撤销"
                  time={certificate.revokedAt ? format(new Date(certificate.revokedAt), 'yyyy/MM/dd HH:mm') : ''}
                  status="error"
                />
              )}
            </div>

            {/* 核验详情列表 */}
            {certificate.verifications && certificate.verifications.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dark-700">
                <p className="text-sm text-dark-400 mb-3">最近核验记录</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {certificate.verifications.slice(0, 5).map((v, idx) => (
                    <div key={v.id || idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-dark-800/50">
                      <span className="text-dark-300">
                        {format(new Date(v.createdAt), 'MM/dd HH:mm')}
                      </span>
                      <span className={v.isValid ? 'text-emerald-400' : 'text-red-400'}>
                        {v.isValid ? '✓ 验证通过' : '✗ 验证失败'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Revoke Modal */}
      {revokeModal && (
        <div className="modal-overlay flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-content"
          >
            <h3 className="text-xl font-semibold text-dark-100 mb-2">撤销证明</h3>
            <p className="text-dark-400 mb-4">
              撤销后，该证明将被标记为无效状态。此操作将同步到区块链上。
            </p>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="请输入撤销原因..."
              className="input-field h-24 resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRevokeModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleRevoke}
                disabled={actionLoading}
                className="btn-danger"
              >
                {actionLoading ? '处理中...' : '确认撤销'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function TimelineItem({ title, time, status }: { title: string; time: string; status: 'completed' | 'pending' | 'error' }) {
  return (
    <div className="flex gap-3">
      <div className="relative">
        <div className={clsx(
          'w-3 h-3 rounded-full',
          status === 'completed' && 'bg-emerald-400',
          status === 'pending' && 'bg-amber-400',
          status === 'error' && 'bg-red-400',
        )} />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-full bg-dark-700" />
      </div>
      <div className="flex-1 pb-4">
        <p className="text-dark-100 font-medium">{title}</p>
        <p className="text-sm text-dark-400">{time}</p>
      </div>
    </div>
  )
}

function CertificateDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 skeleton rounded-lg" />
        <div className="flex-1">
          <div className="h-8 w-48 skeleton rounded" />
          <div className="h-4 w-32 skeleton rounded mt-2" />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-40 skeleton rounded-2xl" />
            <div className="h-40 skeleton rounded-2xl" />
          </div>
        </div>
        <div className="h-80 skeleton rounded-2xl" />
      </div>
    </div>
  )
}

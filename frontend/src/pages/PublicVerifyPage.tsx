import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  CubeIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../services/api'
import PublicCertificatePreview from '../components/PublicCertificatePreview'

interface VerifyResult {
  success: boolean
  isValid: boolean
  data?: {
    id: string
    certNumber: string
    status: string
    studentName: string
    studentId?: string
    university: { name: string; logo?: string }
    company: { name: string; logo?: string }
    position: string
    department?: string
    startDate: string
    endDate: string
    issuedAt?: string
    description?: string
    evaluation?: string
    blockchain?: {
      certHash: string
      txHash: string
      blockNumber: number
      chainId: number
      verification?: {
        isValid: boolean
        onChain: boolean
      }
    }
    attachments?: {
      id: string
      name: string
      size: number
      type: string
      category: string
      downloadUrl: string
    }[]
  }
  message?: string
}

export default function PublicVerifyPage() {
  const { code } = useParams()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<VerifyResult | null>(null)

  useEffect(() => {
    if (code) {
      verifyCode()
    }
  }, [code])

  const verifyCode = async () => {
    try {
      const response = await api.get(`/verify/code/${code}`)
      setResult(response.data)
    } catch (error: any) {
      setResult({
        success: false,
        isValid: false,
        message: error.response?.data?.message || '验证失败',
      })
    } finally {
      setLoading(false)
    }
  }

  // PDF下载函数 - 直接使用fetch和Blob下载
  const downloadPdf = async (certId: string, studentName: string, studentId: string = '') => {
    const loadingToast = toast.loading('正在生成PDF...')
    try {
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const pdfUrl = `${baseUrl}/certificates/${certId}/pdf?download`

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
      const fileName = `${studentName}${studentId ? '_' + studentId : ''}_实习证书.pdf`

      // 使用FileSaver逻辑
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.style.display = 'none'
      link.href = blobUrl
      link.setAttribute('download', fileName)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 bg-accent-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-6"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            返回首页
          </Link>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 mb-6"
          >
            <ShieldCheckIcon className="w-12 h-12 text-primary-400" />
          </motion.div>

          <h1 className="text-3xl font-display font-bold text-dark-100 mb-2">
            实习证明核验
          </h1>
          <p className="text-dark-400">
            链证通 · 高校实习证明上链系统
          </p>
        </div>

        {/* Result */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Status Banner */}
          <div className={`glass-card p-8 text-center ${result?.isValid
            ? 'border border-emerald-500/30 bg-emerald-500/5'
            : 'border border-red-500/30 bg-red-500/5'
            }`}>
            {result?.isValid ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
              >
                <CheckCircleIcon className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-emerald-400 mb-2">
                  ✓ 证明有效
                </h2>
                <p className="text-dark-300">
                  该实习证明已通过区块链验证，信息真实有效
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
              >
                <XCircleIcon className="w-20 h-20 text-red-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-red-400 mb-2">
                  ✗ 证明无效
                </h2>
                <p className="text-dark-300">
                  {result?.message || '该证明不存在或已被撤销'}
                </p>
              </motion.div>
            )}
          </div>

          {/* Certificate Details */}
          {result?.isValid && result.data && (
            <>
              {/* Main Info Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Student Info */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-primary-500/10">
                      <DocumentTextIcon className="w-6 h-6 text-primary-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-dark-100">学生信息</h3>
                  </div>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-dark-500">姓名</dt>
                      <dd className="text-xl font-medium text-dark-100 mt-1">
                        {result.data.studentName}
                      </dd>
                    </div>
                    {result.data.studentId && (
                      <div>
                        <dt className="text-sm text-dark-500">学号</dt>
                        <dd className="text-dark-200 font-mono mt-1">
                          {result.data.studentId}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm text-dark-500">证明编号</dt>
                      <dd className="text-dark-200 font-mono mt-1">
                        {result.data.certNumber}
                      </dd>
                    </div>
                  </dl>
                </motion.div>

                {/* Internship Info */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10">
                      <CalendarIcon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-dark-100">实习信息</h3>
                  </div>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-dark-500">实习岗位</dt>
                      <dd className="text-xl font-medium text-dark-100 mt-1">
                        {result.data.position}
                      </dd>
                    </div>
                    {result.data.department && (
                      <div>
                        <dt className="text-sm text-dark-500">所属部门</dt>
                        <dd className="text-dark-200 mt-1">
                          {result.data.department}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm text-dark-500">实习时间</dt>
                      <dd className="text-dark-200 mt-1">
                        {format(new Date(result.data.startDate), 'yyyy年MM月dd日')}
                        <span className="mx-2 text-dark-500">至</span>
                        {format(new Date(result.data.endDate), 'yyyy年MM月dd日')}
                      </dd>
                    </div>
                  </dl>
                </motion.div>
              </div>

              {/* Institutions */}
              <div className="grid md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-blue-500/10">
                      <BuildingOfficeIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-dark-100">发证高校</h3>
                  </div>
                  <p className="text-xl font-medium text-dark-100">
                    {result.data.university.name}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-purple-500/10">
                      <BuildingOffice2Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-dark-100">实习企业</h3>
                  </div>
                  <p className="text-xl font-medium text-dark-100">
                    {result.data.company.name}
                  </p>
                </motion.div>
              </div>

              {/* Blockchain Verification */}
              {result.data.blockchain && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="glass-card p-6 border border-primary-500/30"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20">
                      <CubeIcon className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-dark-100">区块链验证</h3>
                      <p className="text-sm text-dark-400">证明已永久存储于区块链</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-emerald-400 ml-auto">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      链上已验证
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-dark-800/50">
                      <div className="text-sm text-dark-500 mb-2">证明哈希 (Certification Hash)</div>
                      <p className="font-mono text-sm text-primary-400 break-all">
                        {result.data.blockchain.certHash}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-dark-800/50">
                      <div className="text-sm text-dark-500 mb-2">交易哈希 (Transaction Hash)</div>
                      <p className="font-mono text-sm text-primary-400 break-all">
                        {result.data.blockchain.txHash}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-dark-800/50 text-center">
                        <div className="text-sm text-dark-500">区块高度</div>
                        <p className="text-2xl font-mono font-bold text-dark-100 mt-1">
                          #{result.data.blockchain.blockNumber.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-dark-800/50 text-center">
                        <div className="text-sm text-dark-500">链ID (Chain ID)</div>
                        <p className="text-2xl font-mono font-bold text-dark-100 mt-1">
                          {result.data.blockchain.chainId}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* PDF Certificate Download - 动态生成 */}
              {result.data.status === 'ACTIVE' && result.data.id && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-amber-500/10">
                      <DocumentTextIcon className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-dark-100">证书文件</h3>
                  </div>

                  {/* 证书预览 - A4纸样式 */}
                  <div className="flex justify-center mb-4 overflow-auto">
                    <PublicCertificatePreview data={result.data as any} verifyUrl={window.location.href} />
                  </div>

                  {/* 下载按钮 */}
                  <button
                    onClick={() => downloadPdf(result.data!.id, result.data!.studentName, result.data!.studentId)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <DocumentTextIcon className="w-5 h-5" />
                    下载PDF证书
                  </button>

                  <p className="text-center text-sm text-dark-400 mt-3">
                    点击上方按钮下载完整PDF文件
                  </p>
                </motion.div>
              )}
            </>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-12 pt-8 border-t border-dark-800"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-dark-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-lg font-display font-bold text-dark-200">链证通</span>
          </div>
          <p className="text-dark-500 text-sm">
            高校实习证明上链系统 · 基于区块链技术的可信证明平台
          </p>
          <p className="text-dark-600 text-xs mt-2">
            © 2026 链证通. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

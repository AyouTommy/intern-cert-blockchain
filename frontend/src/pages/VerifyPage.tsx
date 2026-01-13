import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  CubeIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import api from '../services/api'

interface VerifyResult {
  success: boolean
  isValid: boolean
  data?: {
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
    blockchain?: {
      certHash: string
      txHash: string
      blockNumber: number
      chainId: number
    }
  }
  message?: string
}

export default function VerifyPage() {
  const [verifyCode, setVerifyCode] = useState('')
  const [certNumber, setCertNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [activeTab, setActiveTab] = useState<'code' | 'number'>('code')

  const handleVerify = async () => {
    const value = activeTab === 'code' ? verifyCode : certNumber
    if (!value.trim()) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const endpoint = activeTab === 'code' 
        ? `/verify/code/${value.trim()}`
        : `/verify/number/${value.trim()}`
      
      const response = await api.get(endpoint)
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 mb-4"
        >
          <ShieldCheckIcon className="w-10 h-10 text-primary-400" />
        </motion.div>
        <h1 className="page-title">证明核验</h1>
        <p className="page-subtitle">验证实习证明的真实性和有效性</p>
      </div>

      {/* Verify Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-dark-800 rounded-xl">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'code'
                ? 'bg-primary-500 text-white'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <QrCodeIcon className="w-5 h-5 inline mr-2" />
            验证码核验
          </button>
          <button
            onClick={() => setActiveTab('number')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'number'
                ? 'bg-primary-500 text-white'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5 inline mr-2" />
            证明编号核验
          </button>
        </div>

        {/* Input */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            {activeTab === 'code' ? (
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="输入16位验证码..."
                className="input-field pl-12 text-lg font-mono tracking-wider"
                maxLength={16}
              />
            ) : (
              <input
                type="text"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="输入证明编号，如 CERT202401XXXXXX"
                className="input-field pl-12 text-lg font-mono"
              />
            )}
          </div>
          <button
            onClick={handleVerify}
            disabled={loading}
            className="btn-primary px-8"
          >
            {loading ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              '验证'
            )}
          </button>
        </div>

        <p className="text-sm text-dark-500 mt-3 text-center">
          {activeTab === 'code' 
            ? '验证码可在证明二维码或证明详情页中获取' 
            : '证明编号格式为 CERT + 年月 + 随机字符'}
        </p>
      </motion.div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Status Banner */}
          <div className={`glass-card p-6 border-l-4 ${
            result.isValid 
              ? 'border-l-emerald-500 bg-emerald-500/5' 
              : 'border-l-red-500 bg-red-500/5'
          }`}>
            <div className="flex items-center gap-4">
              {result.isValid ? (
                <CheckCircleIcon className="w-12 h-12 text-emerald-400" />
              ) : (
                <XCircleIcon className="w-12 h-12 text-red-400" />
              )}
              <div>
                <h2 className={`text-2xl font-bold ${
                  result.isValid ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {result.isValid ? '证明有效' : '证明无效'}
                </h2>
                <p className="text-dark-400">
                  {result.isValid 
                    ? '该实习证明已通过验证，信息真实有效'
                    : result.message || '该证明不存在或已被撤销'}
                </p>
              </div>
            </div>
          </div>

          {/* Certificate Details */}
          {result.isValid && result.data && (
            <>
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-primary-500/10">
                      <DocumentTextIcon className="w-6 h-6 text-primary-400" />
                    </div>
                    <h3 className="card-title">证明信息</h3>
                  </div>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-dark-400">证明编号</dt>
                      <dd className="font-mono text-dark-100">{result.data.certNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-dark-400">学生姓名</dt>
                      <dd className="text-dark-100 font-medium">{result.data.studentName}</dd>
                    </div>
                    {result.data.studentId && (
                      <div className="flex justify-between">
                        <dt className="text-dark-400">学号</dt>
                        <dd className="text-dark-100">{result.data.studentId}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-dark-400">状态</dt>
                      <dd>
                        <span className="badge-success">有效</span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10">
                      <CalendarIcon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="card-title">实习信息</h3>
                  </div>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-dark-400">实习岗位</dt>
                      <dd className="text-dark-100 font-medium">{result.data.position}</dd>
                    </div>
                    {result.data.department && (
                      <div className="flex justify-between">
                        <dt className="text-dark-400">所属部门</dt>
                        <dd className="text-dark-100">{result.data.department}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-dark-400">实习时间</dt>
                      <dd className="text-dark-100 text-sm">
                        {format(new Date(result.data.startDate), 'yyyy/MM/dd')} - {format(new Date(result.data.endDate), 'yyyy/MM/dd')}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Institutions */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-blue-500/10">
                      <BuildingOfficeIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="card-title">发证高校</h3>
                  </div>
                  <p className="text-lg text-dark-100 font-medium">
                    {result.data.university.name}
                  </p>
                </div>

                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-purple-500/10">
                      <BuildingOffice2Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="card-title">实习企业</h3>
                  </div>
                  <p className="text-lg text-dark-100 font-medium">
                    {result.data.company.name}
                  </p>
                </div>
              </div>

              {/* Blockchain Info */}
              {result.data.blockchain && (
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20">
                      <CubeIcon className="w-6 h-6 text-primary-400" />
                    </div>
                    <h3 className="card-title">区块链验证</h3>
                    <div className="flex items-center gap-2 text-sm text-emerald-400 ml-auto">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      链上已验证
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-dark-800/50">
                      <span className="text-sm text-dark-400">证明哈希</span>
                      <p className="blockchain-hash mt-1 text-xs">
                        {result.data.blockchain.certHash}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-dark-800/50">
                      <span className="text-sm text-dark-400">交易哈希</span>
                      <p className="blockchain-hash mt-1 text-xs">
                        {result.data.blockchain.txHash}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-4 rounded-xl bg-dark-800/50 text-center">
                      <span className="text-sm text-dark-400">区块高度</span>
                      <p className="text-xl font-mono text-dark-100 mt-1">
                        #{result.data.blockchain.blockNumber.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-dark-800/50 text-center">
                      <span className="text-sm text-dark-400">链ID</span>
                      <p className="text-xl font-mono text-dark-100 mt-1">
                        {result.data.blockchain.chainId}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Help Info */}
      {!result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-dark-500 py-8"
        >
          <CubeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>输入验证码或证明编号开始验证</p>
          <p className="text-sm mt-2">
            所有证明信息均已上链存储，验证结果实时获取
          </p>
        </motion.div>
      )}
    </div>
  )
}

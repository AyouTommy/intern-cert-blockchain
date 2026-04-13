import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AcademicCapIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CheckBadgeIcon,
  ShareIcon,
  CubeIcon,
} from '@heroicons/react/24/outline'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'

interface PortfolioCert {
  id: string
  certNumber: string
  position: string
  status: string
  startDate: string
  endDate: string
  issuedAt: string
  companyScore?: number
  companyEvaluation?: string
  university: { name: string; logo?: string }
  company: { name: string; logo?: string }
  blockchain?: { certHash: string; txHash: string }
  ipfsHash?: string
}

/**
 * #21 R-STU 学生个人履历 Portfolio
 * 汇总所有实习证明 + 评价 + 链上凭证
 */
export default function PortfolioPage() {
  const { user } = useAuthStore()
  const [certs, setCerts] = useState<PortfolioCert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPortfolio()
  }, [])

  const fetchPortfolio = async () => {
    try {
      const res = await api.get('/certificates?limit=100')
      const data = res.data.data
      setCerts(Array.isArray(data) ? data : data?.certificates || [])
    } catch {
      setCerts([])
    } finally {
      setLoading(false)
    }
  }

  const activeCerts = certs.filter(c => c.status === 'ACTIVE')
  const totalMonths = certs.reduce((sum, c) => {
    const start = new Date(c.startDate)
    const end = new Date(c.endDate)
    return sum + Math.max(1, Math.round((end.getTime() - start.getTime()) / (30 * 24 * 3600000)))
  }, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 mb-4"
        >
          <AcademicCapIcon className="w-10 h-10 text-primary-400" />
        </motion.div>
        <h1 className="page-title">实习履历</h1>
        <p className="page-subtitle">{user?.name} 的实习证明汇总</p>
      </div>

      {/* 统计概览 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-4 gap-4"
      >
        {[
          { label: '总证明数', value: certs.length, color: 'text-primary-400' },
          { label: '有效证明', value: activeCerts.length, color: 'text-emerald-400' },
          { label: '实习月数', value: `${totalMonths}月`, color: 'text-amber-400' },
          { label: '平均评分', value: activeCerts.length > 0 ? Math.round(activeCerts.reduce((s, c) => s + (c.companyScore || 0), 0) / activeCerts.length) : '-', color: 'text-violet-400' },
        ].map((s, i) => (
          <div key={i} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-dark-400 mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* 实习时间线 */}
      {loading ? (
        <div className="text-center py-12 text-dark-400">加载中...</div>
      ) : certs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <AcademicCapIcon className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">暂无实习证明</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certs.map((cert, i) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link to={`/certificates/${cert.id}`} className="block">
                <div className="glass-card p-5 hover:border-primary-500/30 transition-all group">
                  <div className="flex items-start gap-4">
                    {/* 左侧状态 */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      cert.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' :
                      cert.status === 'PENDING' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-dark-700 text-dark-500'
                    }`}>
                      {cert.status === 'ACTIVE' ? <CheckBadgeIcon className="w-6 h-6" /> :
                       <CubeIcon className="w-6 h-6" />}
                    </div>

                    {/* 中间内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-dark-100 group-hover:text-primary-400 transition-colors">
                          {cert.position}
                        </h3>
                        {cert.status === 'ACTIVE' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">已上链</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-dark-400">
                        <span className="flex items-center gap-1">
                          <BuildingOfficeIcon className="w-3.5 h-3.5" />
                          {cert.company?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {new Date(cert.startDate).toLocaleDateString('zh-CN')} - {new Date(cert.endDate).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      {cert.companyEvaluation && (
                        <p className="text-xs text-dark-500 mt-2 line-clamp-2">
                          💬 {cert.companyEvaluation}
                        </p>
                      )}
                    </div>

                    {/* 右侧评分 */}
                    <div className="text-right flex-shrink-0">
                      {cert.companyScore ? (
                        <div>
                          <p className="text-lg font-bold text-primary-400">{cert.companyScore}</p>
                          <p className="text-xs text-dark-500">企业评分</p>
                        </div>
                      ) : (
                        <p className="text-xs text-dark-600">暂无评分</p>
                      )}
                    </div>
                  </div>

                  {/* 链上信息 */}
                  {cert.blockchain?.txHash && (
                    <div className="mt-3 pt-3 border-t border-dark-800/50 flex items-center gap-2 flex-wrap">
                      <CubeIcon className="w-3.5 h-3.5 text-primary-500/50" />
                      <span className="text-xs font-mono text-dark-600">
                        TX: {cert.blockchain.txHash.slice(0, 16)}...
                      </span>
                      {(cert as any).ipfsHash && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono">
                          📦 IPFS
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* 分享证明 */}
      {activeCerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-5"
        >
          <p className="text-sm text-dark-400 text-center mb-3">
            💡 您可以将证书核验链接分享给任何人，无需登录即可查看和核验
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {activeCerts.map((cert) => (
              <button
                key={cert.id}
                onClick={() => {
                  const url = `${window.location.origin}/verify/${cert.certNumber}`
                  const copyText = (text: string) => {
                    if (navigator.clipboard?.writeText) {
                      return navigator.clipboard.writeText(text)
                    }
                    const ta = document.createElement('textarea')
                    ta.value = text
                    ta.style.position = 'fixed'
                    ta.style.opacity = '0'
                    document.body.appendChild(ta)
                    ta.select()
                    document.execCommand('copy')
                    document.body.removeChild(ta)
                    return Promise.resolve()
                  }
                  copyText(url)
                    .then(() => toast.success(`证书 ${cert.certNumber} 核验链接已复制`))
                    .catch(() => toast.error('复制失败'))
                }}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <ShareIcon className="w-3.5 h-3.5" />
                分享 {cert.certNumber.slice(-6)}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

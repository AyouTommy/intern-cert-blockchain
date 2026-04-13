import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  DocumentTextIcon,
  CheckBadgeIcon,
  ClockIcon,
  XCircleIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  CubeIcon,
} from '@heroicons/react/24/outline'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api, { DashboardStats } from '../services/api'
import { useAuthStore } from '../stores/authStore'

const COLORS = ['#a855f7', '#10b981', '#f59e0b', '#ef4444']

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/stats/dashboard')
      setStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: '总证明数',
      value: stats?.overview.totalCertificates || 0,
      icon: DocumentTextIcon,
      color: 'from-primary-500 to-primary-600',
      bgColor: 'bg-primary-500/10',
      iconColor: 'text-primary-400',
    },
    {
      name: '已上链',
      value: stats?.overview.activeCertificates || 0,
      icon: CheckBadgeIcon,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
    },
    {
      name: '待处理',
      value: stats?.overview.pendingCertificates || 0,
      icon: ClockIcon,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
    },
    {
      name: '已撤销',
      value: stats?.overview.revokedCertificates || 0,
      icon: XCircleIcon,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/10',
      iconColor: 'text-red-400',
    },
  ]

  const extraStats = [
    {
      name: '合作高校',
      value: stats?.overview.totalUniversities || 0,
      icon: BuildingOfficeIcon,
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
    },
    {
      name: '合作企业',
      value: stats?.overview.totalCompanies || 0,
      icon: BuildingOffice2Icon,
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
    },
    {
      name: '注册学生',
      value: stats?.overview.totalStudents || 0,
      icon: UserGroupIcon,
      bgColor: 'bg-pink-500/10',
      iconColor: 'text-pink-400',
    },
    {
      name: '今日核验',
      value: stats?.overview.recentVerifications || 0,
      icon: ShieldCheckIcon,
      bgColor: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
    },
  ]

  const pieData = [
    { name: '已上链', value: stats?.overview.activeCertificates || 0 },
    { name: '待处理', value: stats?.overview.pendingCertificates || 0 },
    { name: '已撤销', value: stats?.overview.revokedCertificates || 0 },
  ].filter(d => d.value > 0)

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">
            欢迎回来，{user?.name}
            <span className="inline-block ml-2 animate-pulse">👋</span>
          </h1>
          <p className="page-subtitle">这是您的实习证明管理控制台</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'UNIVERSITY' || user?.role === 'COMPANY') && (
          <Link to="/certificates/new" className="btn-primary inline-flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5" />
            创建新证明
          </Link>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="stat-card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-display font-bold text-primary-700 mb-1">
              {stat.value.toLocaleString()}
            </p>
            <p className="text-sm text-dark-500">{stat.name}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title mb-0">证明趋势</h2>
            <span className="text-sm text-dark-400">最近7天</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats?.trend || []}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  fontSize={12}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  labelStyle={{ color: '#18181b' }}
                  itemStyle={{ color: '#3f3f46' }}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="新建证明"
                  stroke="#a855f7"
                  fillOpacity={1}
                  fill="url(#colorCreated)"
                />
                <Area
                  type="monotone"
                  dataKey="active"
                  name="已上链"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorActive)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-6">
          <h2 className="section-title">状态分布</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  itemStyle={{ color: '#3f3f46' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-dark-700">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Extra Stats & Blockchain */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Extra Stats */}
        <div className="glass-card p-6">
          <h2 className="section-title">平台概览</h2>
          <div className="grid grid-cols-2 gap-4">
            {extraStats.map((stat, index) => (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-surface-2"
              >
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-primary-700">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-sm text-dark-500">{stat.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Blockchain Status - 增强版 */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20">
              <CubeIcon className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="section-title mb-0">区块链状态</h2>
              <p className="text-sm text-dark-500">智能合约运行情况</p>
            </div>
          </div>

          {stats?.blockchain ? (
            <div className="space-y-4">
              {/* 网络信息 */}
              <div className="p-4 rounded-xl bg-surface-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-dark-400">网络</span>
                  <span className="text-sm font-medium text-primary-600">{stats.blockchain.network.name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-dark-400">链ID</span>
                  <span className="text-sm font-mono text-dark-600">{stats.blockchain.network.chainId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">最新区块</span>
                  <span className="text-sm font-mono text-dark-600">#{stats.blockchain.network.blockNumber.toLocaleString()}</span>
                </div>
              </div>

              {/* 合约地址 */}
              <div className="p-4 rounded-xl bg-surface-2">
                <div className="text-sm text-dark-400 mb-1">合约地址</div>
                <p className="font-mono text-xs text-primary-600 break-all">{stats.blockchain.contractAddress}</p>
                {stats.blockchain.network.chainId === 11155111 && (
                  <a
                    href={`https://sepolia.etherscan.io/address/${stats.blockchain.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-primary-500 hover:text-primary-400 transition-colors"
                  >
                    在 Etherscan 上查看 →
                  </a>
                )}
              </div>

              {/* 链上证明统计 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-surface-2">
                  <p className="text-xl font-bold text-primary-700">{stats.blockchain.total}</p>
                  <p className="text-xs text-dark-400">链上总数</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-surface-2">
                  <p className="text-xl font-bold text-emerald-600">{stats.blockchain.active}</p>
                  <p className="text-xs text-dark-400">有效</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-surface-2">
                  <p className="text-xl font-bold text-red-600">{stats.blockchain.revoked}</p>
                  <p className="text-xs text-dark-400">已撤销</p>
                </div>
              </div>

              {/* Gas 消耗统计 */}
              <div className="p-4 rounded-xl bg-surface-2">
                <div className="text-sm text-dark-400 mb-3">Gas 消耗分析</div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-dark-500">合约部署</span>
                      <span className="font-mono text-dark-600">{stats.blockchain.deployGasUsed.toLocaleString()} Gas</span>
                    </div>
                    <div className="h-2 rounded-full bg-dark-200 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-dark-500">证书上链 (预估)</span>
                      <span className="font-mono text-dark-600">~250,000 Gas</span>
                    </div>
                    <div className="h-2 rounded-full bg-dark-200 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '6.3%' }}
                        transition={{ duration: 1, delay: 0.7 }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-dark-500">证书核验</span>
                      <span className="font-mono text-dark-600">0 Gas (view)</span>
                    </div>
                    <div className="h-2 rounded-full bg-dark-200 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '0%' }}
                        transition={{ duration: 1, delay: 0.9 }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 多方钱包地址 */}
              <div className="p-4 rounded-xl bg-surface-2">
                <div className="text-sm text-dark-400 mb-3">多方确认钱包</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-500">🔑 管理员</span>
                    <span className="font-mono text-xs text-dark-600">{stats.blockchain.wallets.admin.slice(0, 6)}...{stats.blockchain.wallets.admin.slice(-4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-500">🏫 高校</span>
                    <span className="font-mono text-xs text-dark-600">{stats.blockchain.wallets.university.slice(0, 6)}...{stats.blockchain.wallets.university.slice(-4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-500">🏢 企业</span>
                    <span className="font-mono text-xs text-dark-600">{stats.blockchain.wallets.company.slice(0, 6)}...{stats.blockchain.wallets.company.slice(-4)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                智能合约运行正常
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-2 flex items-center justify-center">
                <CubeIcon className="w-8 h-8 text-dark-400" />
              </div>
              <p className="text-dark-600 mb-4">区块链服务未连接</p>
              <p className="text-sm text-dark-500">
                请确保已部署智能合约并配置正确的连接参数
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 企业：链上确认感知卡片 (F2) */}
      {user?.role === 'COMPANY' && (
        <CompanyChainConfirmCard />
      )}

      {/* 第三方机构：核验记录面板 (F3) */}
      {user?.role === 'THIRD_PARTY' && (
        <ThirdPartyVerifyPanel />
      )}

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="section-title">快捷操作</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(user?.role === 'ADMIN' || user?.role === 'UNIVERSITY' || user?.role === 'COMPANY') && (
            <Link
              to="/certificates/new"
              className="flex items-center gap-4 p-4 rounded-xl bg-surface-2 hover:bg-surface-2 transition-colors group"
            >
              <div className="p-3 rounded-xl bg-primary-500/10 group-hover:bg-primary-500/20 transition-colors">
                <DocumentTextIcon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-primary-700">创建证明</p>
                <p className="text-sm text-dark-500">新建实习证明</p>
              </div>
            </Link>
          )}
          {user?.role === 'STUDENT' && (
            <Link
              to="/applications"
              className="flex items-center gap-4 p-4 rounded-xl bg-surface-2 hover:bg-surface-2 transition-colors group"
            >
              <div className="p-3 rounded-xl bg-primary-500/10 group-hover:bg-primary-500/20 transition-colors">
                <DocumentTextIcon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-primary-700">我的申请</p>
                <p className="text-sm text-dark-500">管理实习申请</p>
              </div>
            </Link>
          )}
          <Link
            to="/verify"
            className="flex items-center gap-4 p-4 rounded-xl bg-surface-2 hover:bg-surface-2 transition-colors group"
          >
            <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
              <ShieldCheckIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-primary-700">核验证明</p>
              <p className="text-sm text-dark-500">验证证明真伪</p>
            </div>
          </Link>
          <Link
            to="/certificates"
            className="flex items-center gap-4 p-4 rounded-xl bg-surface-2 hover:bg-surface-2 transition-colors group"
          >
            <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
              <ClockIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-primary-700">实习证明</p>
              <p className="text-sm text-dark-500">
                {stats?.overview.pendingCertificates || 0} 条待上链
              </p>
            </div>
          </Link>
          {(user?.role === 'ADMIN' || user?.role === 'UNIVERSITY' || user?.role === 'COMPANY') && (
            <Link
              to="/settings"
              className="flex items-center gap-4 p-4 rounded-xl bg-surface-2 hover:bg-surface-2 transition-colors group"
            >
              <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                <CubeIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-primary-700">系统设置</p>
                <p className="text-sm text-dark-500">配置与管理</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 skeleton" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 skeleton rounded-2xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 skeleton rounded-2xl" />
        <div className="h-80 skeleton rounded-2xl" />
      </div>
    </div>
  )
}

// F2: 企业链上确认感知卡片
function CompanyChainConfirmCard() {
  const [pendingCerts, setPendingCerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/certificates?status=PENDING&limit=5')
      .then(res => setPendingCerts(res.data.data?.certificates || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-xl bg-amber-500/10">
          <CubeIcon className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="section-title mb-0">链上确认任务</h2>
          <p className="text-sm text-dark-500">等待贵企业链上确认的实习证明</p>
        </div>
        {pendingCerts.length > 0 && (
          <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
            {pendingCerts.length} 条待确认
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
        </div>
      ) : pendingCerts.length === 0 ? (
        <div className="text-center py-6 text-dark-500">
          <CheckBadgeIcon className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
          <p>暂无待确认的链上操作</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingCerts.map(cert => (
            <Link
              key={cert.id}
              to={`/certificates/${cert.id}`}
              className="flex items-center justify-between p-4 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-primary-700">{cert.certNumber}</p>
                  <p className="text-xs text-dark-500">{cert.position} · {cert.student?.user?.name || '学生'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cert.universityAddr ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">🏫 高校已确认</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-dark-200 text-dark-500">🏫 待高校确认</span>
                )}
                {cert.companyAddr ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">🏢 企业已确认</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 animate-pulse">🏢 待企业确认</span>
                )}
              </div>
            </Link>
          ))}
          <Link to="/certificates" className="block text-center text-sm text-primary-500 hover:text-primary-400 mt-2">
            查看全部证明 →
          </Link>
        </div>
      )}

      <div className="mt-4 p-3 rounded-lg bg-primary-500/5 border border-primary-500/10">
        <p className="text-xs text-dark-500">
          💡 <strong>流程说明</strong>：高校批准实习申请后自动发起链上请求，企业需确认签名后证书才在区块链上正式生效。
        </p>
      </div>
    </motion.div>
  )
}

// F3: 第三方机构核验记录面板
function ThirdPartyVerifyPanel() {
  const [records, setRecords] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/verify/my-records?limit=10')
      .then(res => {
        setRecords(res.data.data?.records || [])
        setTotalCount(res.data.data?.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-xl bg-cyan-500/10">
          <ShieldCheckIcon className="w-6 h-6 text-cyan-500" />
        </div>
        <div>
          <h2 className="section-title mb-0">我的核验记录</h2>
          <p className="text-sm text-dark-500">您已核验 {totalCount} 份实习证明</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 skeleton rounded-xl" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-6 text-dark-500">
          <ShieldCheckIcon className="w-12 h-12 mx-auto mb-2 text-dark-300" />
          <p>暂无核验记录</p>
          <Link to="/verify" className="text-sm text-primary-500 hover:text-primary-400 mt-2 inline-block">
            前往核验证明 →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((record: any) => (
            <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-2">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${record.isValid ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div>
                  <p className="text-sm font-medium text-primary-700">
                    {record.certificate?.certNumber || '证书'}
                  </p>
                  <p className="text-xs text-dark-500">
                    {new Date(record.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                record.isValid
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-red-500/10 text-red-600'
              }`}>
                {record.isValid ? '✅ 有效' : '❌ 无效'}
              </span>
            </div>
          ))}
          <Link to="/verify" className="block text-center text-sm text-primary-500 hover:text-primary-400 mt-3">
            前往核验更多证明 →
          </Link>
        </div>
      )}
    </motion.div>
  )
}


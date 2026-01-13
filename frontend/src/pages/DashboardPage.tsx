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

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444']

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
            <p className="text-3xl font-display font-bold text-white mb-1">
              {stat.value.toLocaleString()}
            </p>
            <p className="text-sm text-dark-400">{stat.name}</p>
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
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="新建证明"
                  stroke="#0ea5e9"
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
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
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
                <span className="text-sm text-dark-300">{entry.name}</span>
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
                className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50"
              >
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-white">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-sm text-dark-400">{stat.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Blockchain Status */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20">
              <CubeIcon className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="section-title mb-0">区块链状态</h2>
              <p className="text-sm text-dark-400">智能合约运行情况</p>
            </div>
          </div>

          {stats?.blockchain ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50">
                <span className="text-dark-300">链上证明总数</span>
                <span className="text-xl font-semibold text-white">
                  {stats.blockchain.total.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50">
                <span className="text-dark-300">有效证明</span>
                <span className="text-xl font-semibold text-emerald-400">
                  {stats.blockchain.active.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50">
                <span className="text-dark-300">已撤销</span>
                <span className="text-xl font-semibold text-red-400">
                  {stats.blockchain.revoked.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                智能合约运行正常
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                <CubeIcon className="w-8 h-8 text-dark-500" />
              </div>
              <p className="text-dark-400 mb-4">区块链服务未连接</p>
              <p className="text-sm text-dark-500">
                请确保已部署智能合约并配置正确的连接参数
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="section-title">快捷操作</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/certificates/new"
            className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50 hover:bg-dark-700/50 transition-colors group"
          >
            <div className="p-3 rounded-xl bg-primary-500/10 group-hover:bg-primary-500/20 transition-colors">
              <DocumentTextIcon className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="font-medium text-white">创建证明</p>
              <p className="text-sm text-dark-400">新建实习证明</p>
            </div>
          </Link>
          <Link
            to="/verify"
            className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50 hover:bg-dark-700/50 transition-colors group"
          >
            <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
              <ShieldCheckIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-white">核验证明</p>
              <p className="text-sm text-dark-400">验证证明真伪</p>
            </div>
          </Link>
          <Link
            to="/certificates"
            className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50 hover:bg-dark-700/50 transition-colors group"
          >
            <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
              <ClockIcon className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-white">待处理</p>
              <p className="text-sm text-dark-400">
                {stats?.overview.pendingCertificates || 0} 条待上链
              </p>
            </div>
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50 hover:bg-dark-700/50 transition-colors group"
          >
            <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
              <CubeIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-white">系统设置</p>
              <p className="text-sm text-dark-400">配置与管理</p>
            </div>
          </Link>
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

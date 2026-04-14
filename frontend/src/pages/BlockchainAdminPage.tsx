import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CubeIcon,
  WalletIcon,
  ArrowPathIcon,
  DocumentMagnifyingGlassIcon,
  ShieldCheckIcon,
  ServerStackIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  BanknotesIcon,
  SignalIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api from '../services/api'

const TABS = [
  { key: 'overview', label: '合约与资产', icon: CubeIcon },
  { key: 'transactions', label: '交易管理', icon: DocumentMagnifyingGlassIcon },
  { key: 'services', label: '服务健康', icon: ServerStackIcon },
] as const

type TabKey = typeof TABS[number]['key']

export default function BlockchainAdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [wallets, setWallets] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any>(null)
  const [services, setServices] = useState<any>(null)
  const [txFilter, setTxFilter] = useState('')
  const [txKeyword, setTxKeyword] = useState('')
  const [reconcileResult, setReconcileResult] = useState<any>(null)
  const [fundAmount, setFundAmount] = useState('0.01')
  const [showFundModal, setShowFundModal] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState('')

  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get('/stats/blockchain-admin/overview')
      setOverview(res.data.data)
    } catch (e) { console.error(e) }
  }, [])

  const fetchWallets = useCallback(async () => {
    try {
      const res = await api.get('/stats/blockchain-admin/wallets')
      setWallets(res.data.data.wallets)
    } catch (e) { console.error(e) }
  }, [])

  const fetchTransactions = useCallback(async () => {
    try {
      const params: any = {}
      if (txFilter) params.type = txFilter
      if (txKeyword) params.keyword = txKeyword
      const res = await api.get('/stats/blockchain-admin/transactions', { params })
      setTransactions(res.data.data)
    } catch (e) { console.error(e) }
  }, [txFilter, txKeyword])

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/stats/blockchain-admin/services')
      setServices(res.data.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([fetchOverview(), fetchWallets()])
      setLoading(false)
    }
    loadAll()
  }, [fetchOverview, fetchWallets])

  useEffect(() => {
    if (activeTab === 'transactions') fetchTransactions()
    if (activeTab === 'services') fetchServices()
  }, [activeTab, fetchTransactions, fetchServices])

  // 操作函数
  const handlePauseContract = async (pause: boolean) => {
    if (!confirm(pause ? '确认暂停合约？暂停后所有上链和撤销操作将停止。' : '确认恢复合约？')) return
    setActionLoading(pause ? 'pause' : 'unpause')
    try {
      const res = await api.post(`/stats/blockchain-admin/contract/${pause ? 'pause' : 'unpause'}`)
      toast.success(`合约已${pause ? '暂停' : '恢复'}，交易: ${res.data.data.txHash.slice(0, 10)}...`)
      fetchOverview()
    } catch (e: any) {
      toast.error(e.response?.data?.message || '操作失败')
    } finally { setActionLoading('') }
  }

  const handleFundWallet = async () => {
    if (!selectedWallet) return
    setActionLoading('fund')
    try {
      const res = await api.post(`/stats/blockchain-admin/wallets/${selectedWallet.id}/fund`, { amount: fundAmount })
      toast.success(`已向 ${res.data.data.name} 充值 ${fundAmount} ETH`)
      setShowFundModal(false)
      fetchWallets()
    } catch (e: any) {
      toast.error(e.response?.data?.message || '充值失败')
    } finally { setActionLoading('') }
  }

  const handleFundLow = async () => {
    if (!confirm('确认批量补充所有余额不足 0.01 ETH 的钱包？')) return
    setActionLoading('fund-low')
    try {
      const res = await api.post('/stats/blockchain-admin/wallets/fund-low')
      toast.success(`已补充 ${res.data.data.funded} 个钱包`)
      fetchWallets()
    } catch (e: any) {
      toast.error(e.response?.data?.message || '批量充值失败')
    } finally { setActionLoading('') }
  }

  const handleRetry = async (certId: string) => {
    setActionLoading(`retry-${certId}`)
    try {
      await api.post(`/stats/blockchain-admin/transactions/${certId}/retry`)
      toast.success('已重置状态，Cron 任务将自动拾取重试')
      fetchTransactions()
    } catch (e: any) {
      toast.error(e.response?.data?.message || '重试失败')
    } finally { setActionLoading('') }
  }

  const handleReconcile = async () => {
    setActionLoading('reconcile')
    try {
      const res = await api.post('/stats/blockchain-admin/reconcile')
      setReconcileResult(res.data.data)
      if (res.data.data.isConsistent) {
        toast.success('链上/链下数据完全一致')
      } else {
        toast.error(`发现 ${res.data.data.inconsistentCount} 条不一致记录`)
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || '对账失败')
    } finally { setActionLoading('') }
  }

  const handleTestRpc = async () => {
    setActionLoading('test-rpc')
    try {
      const res = await api.post('/stats/blockchain-admin/services/test-rpc')
      toast.success(`RPC 正常，区块 #${res.data.data.blockNumber}，延迟 ${res.data.data.latencyMs}ms`)
    } catch (e: any) {
      toast.error('RPC 连接失败')
    } finally { setActionLoading('') }
  }

  const handleTestIpfs = async () => {
    setActionLoading('test-ipfs')
    try {
      const res = await api.post('/stats/blockchain-admin/services/test-ipfs')
      toast.success(`IPFS 正常，CID: ${res.data.data.cid.slice(0, 12)}...`)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'IPFS 测试失败')
    } finally { setActionLoading('') }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('已复制到剪贴板')
  }

  const getEtherscanUrl = (type: 'address' | 'tx', hash: string) =>
    `https://sepolia.etherscan.io/${type}/${hash}`

  const getBalanceStatus = (balance: string) => {
    const b = parseFloat(balance)
    if (b >= 0.05) return { label: '充足', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
    if (b >= 0.01) return { label: '偏低', color: 'text-amber-400', bg: 'bg-amber-500/10' }
    return { label: '不足', color: 'text-red-400', bg: 'bg-red-500/10' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <CubeIcon className="w-12 h-12 text-primary-400 mx-auto animate-pulse" />
          <p className="text-dark-400">加载区块链运维数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20">
          <CubeIcon className="w-8 h-8 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-dark-100">区块链运维中心</h1>
          <p className="text-sm text-dark-500">实时监控合约状态、钱包资产、链上交易与系统服务</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: '合约状态',
            value: overview?.contract?.connected
              ? overview.contract.paused ? '已暂停' : '运行中'
              : '未连接',
            icon: ShieldCheckIcon,
            color: overview?.contract?.connected && !overview?.contract?.paused
              ? 'text-emerald-400' : 'text-red-400',
            pulse: overview?.contract?.connected && !overview?.contract?.paused,
          },
          {
            label: '链上证书', value: overview?.summary?.activeCerts || 0,
            icon: CubeIcon, color: 'text-primary-400',
          },
          {
            label: '链上交易', value: overview?.summary?.totalTransactions || 0,
            icon: BanknotesIcon, color: 'text-blue-400',
          },
          {
            label: '累计核验', value: overview?.summary?.totalVerifications || 0,
            icon: DocumentMagnifyingGlassIcon, color: 'text-emerald-400',
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`w-6 h-6 ${card.color}`} />
              {card.pulse && (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-bold text-dark-100">{card.value}</p>
            <p className="text-sm text-dark-500">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-dark-800/50">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* -------- TAB: 合约与资产 -------- */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* 合约信息 */}
                <div className="glass-card p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
                    <CpuChipIcon className="w-5 h-5 text-primary-400" />
                    智能合约信息
                  </h3>

                  {overview?.contract?.connected ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-surface-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-dark-400">合约地址</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-primary-400">
                              {overview.contract.address?.slice(0, 6)}...{overview.contract.address?.slice(-4)}
                            </span>
                            <button onClick={() => copyToClipboard(overview.contract.address)} className="p-1 rounded hover:bg-dark-700 transition-colors">
                              <ClipboardDocumentIcon className="w-3.5 h-3.5 text-dark-400" />
                            </button>
                            <a href={getEtherscanUrl('address', overview.contract.address)} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-dark-700 transition-colors">
                              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-primary-400" />
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-dark-400">网络</span>
                          <span className="text-sm font-medium text-dark-200">{overview.contract.network?.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-dark-400">Chain ID</span>
                          <span className="text-sm font-mono text-dark-300">{overview.contract.network?.chainId}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-dark-400">最新区块</span>
                          <span className="text-sm font-mono text-dark-300">#{overview.contract.network?.blockNumber?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-dark-400">合约版本</span>
                          <span className="text-sm text-dark-200">InternCertV2</span>
                        </div>
                      </div>

                      {/* 安全组件 */}
                      <div className="p-4 rounded-xl bg-surface-2">
                        <p className="text-sm text-dark-400 mb-3">安全组件</p>
                        <div className="space-y-2">
                          {overview.security?.map((s: any) => (
                            <div key={s.name} className="flex items-center gap-2">
                              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm text-dark-200 font-medium">{s.name}</span>
                              <span className="text-xs text-dark-500">— {s.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 紧急操作 */}
                      <div className="p-4 rounded-xl bg-surface-2">
                        <p className="text-sm text-dark-400 mb-3">紧急操作</p>
                        <div className="flex gap-3">
                          {overview.contract.paused ? (
                            <button
                              onClick={() => handlePauseContract(false)}
                              disabled={actionLoading === 'unpause'}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              <PlayCircleIcon className="w-4 h-4" />
                              {actionLoading === 'unpause' ? '执行中...' : '恢复合约'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePauseContract(true)}
                              disabled={actionLoading === 'pause'}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              <PauseCircleIcon className="w-4 h-4" />
                              {actionLoading === 'pause' ? '执行中...' : '暂停合约'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <XCircleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
                      <p className="text-dark-400">合约未连接</p>
                    </div>
                  )}
                </div>

                {/* 技术架构 */}
                <div className="glass-card p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
                    <CpuChipIcon className="w-5 h-5 text-accent-400" />
                    技术架构
                  </h3>
                  <div className="space-y-3">
                    {overview?.architecture?.map((item: any, i: number) => (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-xl bg-surface-2"
                      >
                        <p className="text-sm font-medium text-dark-200 mb-1">{item.name}</p>
                        <p className="text-xs text-dark-500">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 钱包资产 */}
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
                    <WalletIcon className="w-5 h-5 text-amber-400" />
                    钱包资产监控
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={fetchWallets}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 transition-colors text-sm"
                    >
                      <ArrowPathIcon className="w-3.5 h-3.5" /> 刷新
                    </button>
                    <button
                      onClick={handleFundLow}
                      disabled={actionLoading === 'fund-low'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <BanknotesIcon className="w-3.5 h-3.5" />
                      {actionLoading === 'fund-low' ? '补充中...' : '批量补充不足'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {wallets.map((w) => {
                    const status = getBalanceStatus(w.balance)
                    return (
                      <div key={w.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-2 hover:bg-dark-700/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {w.type === 'admin' ? '🔑' : w.type === 'university' ? '🏫' : '🏢'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-dark-200">{w.label}</p>
                            <p className="text-xs font-mono text-dark-500">
                              {w.address?.slice(0, 6)}...{w.address?.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold text-dark-100">
                              {parseFloat(w.balance).toFixed(4)} ETH
                            </p>
                            <span className={`text-xs ${status.color}`}>{status.label}</span>
                          </div>
                          <div className="flex gap-1">
                            <a
                              href={getEtherscanUrl('address', w.address)}
                              target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-dark-600 transition-colors"
                              title="Etherscan"
                            >
                              <ArrowTopRightOnSquareIcon className="w-4 h-4 text-primary-400" />
                            </a>
                            {w.type !== 'admin' && (
                              <button
                                onClick={() => { setSelectedWallet(w); setShowFundModal(true) }}
                                className="p-1.5 rounded-lg hover:bg-dark-600 transition-colors"
                                title="充值"
                              >
                                <BanknotesIcon className="w-4 h-4 text-amber-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* -------- TAB: 交易管理 -------- */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              {/* 筛选 */}
              <div className="glass-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { key: '', label: '全部' },
                    { key: 'active', label: '上链成功' },
                    { key: 'revoked', label: '已撤销' },
                    { key: 'pending', label: '处理中' },
                    { key: 'failed', label: '失败' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setTxFilter(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        txFilter === f.key
                          ? 'bg-primary-500/20 text-primary-400'
                          : 'text-dark-400 hover:bg-dark-700'
                      }`}
                    >{f.label}</button>
                  ))}
                  <input
                    type="text"
                    placeholder="搜索证书编号..."
                    value={txKeyword}
                    onChange={(e) => setTxKeyword(e.target.value)}
                    className="ml-auto px-3 py-1.5 rounded-lg bg-dark-700 border border-dark-600 text-sm text-dark-200 placeholder-dark-500 w-48"
                  />
                  <button onClick={fetchTransactions} className="p-1.5 rounded-lg hover:bg-dark-700 transition-colors">
                    <ArrowPathIcon className="w-4 h-4 text-dark-400" />
                  </button>
                </div>
              </div>

              {/* 交易列表 */}
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-700">
                        <th className="text-left p-4 text-dark-400 font-medium">时间</th>
                        <th className="text-left p-4 text-dark-400 font-medium">证书编号</th>
                        <th className="text-left p-4 text-dark-400 font-medium">学生</th>
                        <th className="text-left p-4 text-dark-400 font-medium">状态</th>
                        <th className="text-left p-4 text-dark-400 font-medium">交易哈希</th>
                        <th className="text-right p-4 text-dark-400 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions?.records?.map((tx: any) => (
                        <tr key={tx.id} className="border-b border-dark-800 hover:bg-dark-800/30 transition-colors">
                          <td className="p-4 text-dark-300 text-xs">
                            {new Date(tx.time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-xs text-dark-200">{tx.certNumber?.slice(-10)}</span>
                          </td>
                          <td className="p-4 text-dark-300 text-xs">{tx.studentName || '-'}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                              tx.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                              tx.status === 'REVOKED' ? 'bg-red-500/10 text-red-400' :
                              tx.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                              'bg-amber-500/10 text-amber-400'
                            }`}>
                              {tx.status === 'ACTIVE' ? '✅ 成功' :
                               tx.status === 'REVOKED' ? '🔴 撤销' :
                               tx.status === 'FAILED' ? `❌ 失败${tx.retryCount ? ` (${tx.retryCount}次)` : ''}` :
                               '⏳ 处理中'}
                            </span>
                          </td>
                          <td className="p-4">
                            {tx.txHash ? (
                              <a
                                href={getEtherscanUrl('tx', tx.txHash)}
                                target="_blank" rel="noopener noreferrer"
                                className="font-mono text-xs text-primary-400 hover:text-primary-300"
                              >
                                {tx.txHash.slice(0, 10)}...
                              </a>
                            ) : <span className="text-dark-600 text-xs">—</span>}
                          </td>
                          <td className="p-4 text-right">
                            {tx.status === 'FAILED' && (
                              <button
                                onClick={() => handleRetry(tx.id)}
                                disabled={actionLoading === `retry-${tx.id}`}
                                className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-medium disabled:opacity-50"
                              >
                                {actionLoading === `retry-${tx.id}` ? '重试中...' : '重试上链'}
                              </button>
                            )}
                            {tx.txHash && (
                              <a
                                href={getEtherscanUrl('tx', tx.txHash)}
                                target="_blank" rel="noopener noreferrer"
                                className="ml-2 p-1 rounded hover:bg-dark-700 inline-block"
                              >
                                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-dark-400" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!transactions?.records?.length && (
                        <tr><td colSpan={6} className="p-8 text-center text-dark-500">暂无交易记录</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {transactions?.total > 0 && (
                  <div className="p-4 border-t border-dark-700 text-sm text-dark-500">
                    共 {transactions.total} 条记录
                  </div>
                )}
              </div>

              {/* 对账 */}
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
                    <SignalIcon className="w-5 h-5 text-blue-400" />
                    链上/链下一致性对账
                  </h3>
                  <button
                    onClick={handleReconcile}
                    disabled={actionLoading === 'reconcile'}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${actionLoading === 'reconcile' ? 'animate-spin' : ''}`} />
                    {actionLoading === 'reconcile' ? '对账中...' : '立即对账'}
                  </button>
                </div>
                {reconcileResult && (
                  <div className="p-4 rounded-xl bg-surface-2 space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xl font-bold text-dark-100">{reconcileResult.checkedCount}</p>
                        <p className="text-xs text-dark-500">已检查</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-emerald-400">{reconcileResult.totalActive - reconcileResult.inconsistentCount}</p>
                        <p className="text-xs text-dark-500">一致</p>
                      </div>
                      <div>
                        <p className={`text-xl font-bold ${reconcileResult.inconsistentCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {reconcileResult.inconsistentCount}
                        </p>
                        <p className="text-xs text-dark-500">不一致</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {reconcileResult.isConsistent ? (
                        <><CheckCircleIcon className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">数据完全一致</span></>
                      ) : (
                        <><ExclamationTriangleIcon className="w-4 h-4 text-red-400" /><span className="text-red-400">发现不一致记录</span></>
                      )}
                      <span className="text-dark-600 text-xs ml-auto">对账时间: {new Date(reconcileResult.checkedAt).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -------- TAB: 服务健康 -------- */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-dark-100">系统服务状态</h3>
                <button onClick={fetchServices} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 transition-colors text-sm">
                  <ArrowPathIcon className="w-3.5 h-3.5" /> 刷新
                </button>
              </div>
              {services?.services?.map((svc: any, i: number) => (
                <motion.div
                  key={svc.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      svc.status === 'ok' ? 'bg-emerald-400 animate-pulse' :
                      svc.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-dark-200">{svc.name}</p>
                      <p className="text-xs text-dark-500">{svc.detail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      svc.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400' :
                      svc.status === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {svc.status === 'ok' ? '正常' : svc.status === 'warning' ? '警告' : '异常'}
                    </span>
                    {svc.name.includes('RPC') && (
                      <button
                        onClick={handleTestRpc}
                        disabled={actionLoading === 'test-rpc'}
                        className="px-3 py-1 rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 text-xs disabled:opacity-50"
                      >
                        {actionLoading === 'test-rpc' ? '测试中...' : '测试连接'}
                      </button>
                    )}
                    {svc.name.includes('IPFS') && (
                      <button
                        onClick={handleTestIpfs}
                        disabled={actionLoading === 'test-ipfs'}
                        className="px-3 py-1 rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 text-xs disabled:opacity-50"
                      >
                        {actionLoading === 'test-ipfs' ? '测试中...' : '测试连接'}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              {services?.checkedAt && (
                <p className="text-xs text-dark-600 text-right">检测时间: {new Date(services.checkedAt).toLocaleString('zh-CN')}</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 充值弹窗 */}
      {showFundModal && selectedWallet && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowFundModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-md mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-dark-100">手动充值</h3>
            <div className="p-3 rounded-xl bg-surface-2">
              <p className="text-sm text-dark-200">{selectedWallet.label}</p>
              <p className="text-xs font-mono text-dark-500">{selectedWallet.address}</p>
              <p className="text-sm text-dark-400 mt-1">当前余额: {parseFloat(selectedWallet.balance).toFixed(4)} ETH</p>
            </div>
            <div>
              <label className="text-sm text-dark-400 mb-1 block">充值金额 (ETH)</label>
              <input
                type="number"
                step="0.001"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-dark-200"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowFundModal(false)} className="px-4 py-2 rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 text-sm">
                取消
              </button>
              <button
                onClick={handleFundWallet}
                disabled={actionLoading === 'fund'}
                className="px-4 py-2 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 text-sm font-medium disabled:opacity-50"
              >
                {actionLoading === 'fund' ? '转账中...' : '确认充值'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

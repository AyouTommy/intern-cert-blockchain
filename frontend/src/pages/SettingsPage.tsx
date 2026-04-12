import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  CubeIcon,
  CheckIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import api, { BlockchainInfo } from '../services/api'
import clsx from 'clsx'

interface ProfileForm {
  name: string
  phone: string
  walletAddress: string
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const allTabs = [
  { id: 'profile', name: '个人信息', icon: UserCircleIcon },
  { id: 'security', name: '安全设置', icon: KeyIcon },
  { id: 'notifications', name: '通知设置', icon: BellIcon },
  { id: 'blockchain', name: '区块链', icon: CubeIcon },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user, updateUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [blockchainInfo, setBlockchainInfo] = useState<BlockchainInfo | null>(null)
  const [bcLoading, setBcLoading] = useState(false)

  // 学生不显示区块链Tab（运维面板，学生不参与合约管理）
  const tabs = allTabs.filter(t => 
    t.id !== 'blockchain' || (user?.role !== 'STUDENT')
  )

  // 加载区块链信息
  useEffect(() => {
    if (activeTab === 'blockchain' && !blockchainInfo) {
      setBcLoading(true)
      api.get('/stats/blockchain-info').then(res => {
        setBlockchainInfo(res.data.data)
      }).catch(() => {}).finally(() => setBcLoading(false))
    }
  }, [activeTab])

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      walletAddress: user?.walletAddress || '',
    },
  })

  const passwordForm = useForm<PasswordForm>()

  const handleProfileSubmit = async (data: ProfileForm) => {
    setLoading(true)
    try {
      await updateUser(data)
      toast.success('个人信息更新成功')
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      await api.put('/auth/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast.success('密码修改成功')
      passwordForm.reset()
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">设置</h1>
        <p className="page-subtitle">管理您的账户和偏好设置</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="md:w-56 flex-shrink-0">
          <nav className="glass-card p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  activeTab === tab.id
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800/50'
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <h2 className="card-title mb-6">个人信息</h2>

              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-dark-100 text-2xl font-bold">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-dark-100 font-medium">{user?.name}</p>
                    <p className="text-dark-400 text-sm">{user?.email}</p>
                  </div>
                </div>

                <div>
                  <label className="input-label">姓名</label>
                  <input
                    type="text"
                    {...profileForm.register('name', { required: true })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">手机号</label>
                  <input
                    type="tel"
                    {...profileForm.register('phone')}
                    className="input-field"
                    placeholder="请输入手机号"
                  />
                </div>

                {/* 钱包地址 - 仅对学生用户显示 */}
                {user?.role === 'STUDENT' && (
                  <div>
                    <label className="input-label">钱包地址</label>
                    <input
                      type="text"
                      {...profileForm.register('walletAddress')}
                      className="input-field font-mono text-sm"
                      placeholder="0x..."
                    />
                    <p className="text-xs text-dark-500 mt-1">
                      您的以太坊钱包地址，证书上链时将记录此地址作为证书归属标识
                    </p>
                  </div>
                )}

                <div className="pt-4">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? '保存中...' : '保存更改'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <h2 className="card-title mb-6">修改密码</h2>

              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4 max-w-md">
                <div>
                  <label className="input-label">当前密码</label>
                  <input
                    type="password"
                    {...passwordForm.register('currentPassword', { required: true })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">新密码</label>
                  <input
                    type="password"
                    {...passwordForm.register('newPassword', { required: true, minLength: 6 })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">确认新密码</label>
                  <input
                    type="password"
                    {...passwordForm.register('confirmPassword', { required: true })}
                    className="input-field"
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? '修改中...' : '修改密码'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <h2 className="card-title mb-6">通知设置</h2>

              <div className="space-y-4">
                {[
                  { id: 'email', name: '邮件通知', desc: '证明状态变更时发送邮件通知' },
                  { id: 'upchain', name: '上链通知', desc: '证明成功上链时通知' },
                  { id: 'verify', name: '核验通知', desc: '有人核验您的证明时通知' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50">
                    <div>
                      <p className="text-dark-100 font-medium">{item.name}</p>
                      <p className="text-sm text-dark-400">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="pt-6">
                <button className="btn-primary">保存设置</button>
              </div>
            </motion.div>
          )}

          {activeTab === 'blockchain' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {bcLoading ? (
                <div className="glass-card p-12 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full" />
                </div>
              ) : blockchainInfo ? (
                <>
                  {/* 网络状态 */}
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="card-title">🌐 网络状态</h3>
                      <span className={`flex items-center gap-2 text-sm ${
                        blockchainInfo.connected ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          blockchainInfo.connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                        }`} />
                        {blockchainInfo.connected ? '已连接' : '未连接'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 rounded-xl bg-dark-800/50 text-center">
                        <p className="text-xs text-dark-400">网络名称</p>
                        <p className="text-dark-100 font-medium mt-1">{blockchainInfo.network.name}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-dark-800/50 text-center">
                        <p className="text-xs text-dark-400">Chain ID</p>
                        <p className="text-dark-100 font-mono font-medium mt-1">{blockchainInfo.network.chainId}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-dark-800/50 text-center">
                        <p className="text-xs text-dark-400">最新区块</p>
                        <p className="text-dark-100 font-mono font-medium mt-1">#{blockchainInfo.network.blockNumber.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* 智能合约 */}
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="card-title">📄 智能合约</h3>
                      <span className="badge-success">
                        <CheckIcon className="w-3 h-3 mr-1" />
                        已部署
                      </span>
                    </div>
                    {blockchainInfo.contract.address && (
                      <div className="p-4 rounded-xl bg-dark-800/50">
                        <p className="text-xs text-dark-400 mb-1">合约地址</p>
                        <p className="blockchain-hash text-xs text-primary-400">{blockchainInfo.contract.address}</p>
                        <a
                          href={`https://sepolia.etherscan.io/address/${blockchainInfo.contract.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-primary-400 hover:text-primary-300"
                        >
                          <LinkIcon className="w-3 h-3" />
                          在 Etherscan 上查看
                        </a>
                      </div>
                    )}
                  </div>

                  {/* 多方确认钱包 */}
                  <div className="glass-card p-6">
                    <h3 className="card-title mb-4">🔑 多方确认钱包</h3>
                    <div className="space-y-3">
                      {[
                        { label: '管理员', addr: blockchainInfo.wallets.admin, icon: '🛡️', role: 'ADMIN' },
                        { label: '高校', addr: blockchainInfo.wallets.university, icon: '🏫', role: 'UNIVERSITY' },
                        { label: '企业', addr: blockchainInfo.wallets.company, icon: '🏢', role: 'COMPANY' },
                      ].map(w => {
                        const isMyRole = user?.role === w.role;
                        const showFull = isMyRole || user?.role === 'ADMIN';
                        return (
                          <div key={w.role} className={`p-4 rounded-xl ${
                            isMyRole ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-dark-800/50'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-dark-300">{w.icon} {w.label}钱包</span>
                              {isMyRole && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                                  当前角色
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-xs text-dark-200">
                              {showFull ? w.addr : `${w.addr.slice(0, 8)}...${w.addr.slice(-6)}`}
                            </p>
                            {isMyRole && (
                              <p className="text-xs text-primary-400/70 mt-1">
                                {w.role === 'UNIVERSITY' ? '每次审核通过时将使用该地址进行链上签名确认'
                                  : w.role === 'COMPANY' ? '证书的企业确认步骤将使用该地址进行签名'
                                  : '作为管理员，您可以查看和管理所有链上操作'}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 上链机制 */}
                  <div className="glass-card p-6">
                    <h3 className="card-title mb-4">⚙️ 上链机制</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-dark-800/50 flex items-center justify-between">
                        <span className="text-sm text-dark-300">多方确认</span>
                        <span className="text-emerald-400 text-sm">● 已启用</span>
                      </div>
                      <div className="p-3 rounded-xl bg-dark-800/50 flex items-center justify-between">
                        <span className="text-sm text-dark-300">自动重试</span>
                        <span className="text-emerald-400 text-sm">● {blockchainInfo.features.autoRetry.maxRetries}次</span>
                      </div>
                    </div>
                  </div>

                  {/* Gas 消耗分析 */}
                  <div className="glass-card p-6">
                    <h3 className="card-title mb-4">⛽ Gas 消耗分析</h3>
                    <div className="space-y-3">
                      {[
                        { label: '合约部署', gas: blockchainInfo.gas.deployGasUsed, color: 'from-primary-500 to-accent-500' },
                        { label: '单次上链', gas: blockchainInfo.gas.estimatePerCert, color: 'from-emerald-500 to-teal-500' },
                        { label: '核验消耗', gas: blockchainInfo.gas.estimateVerify, color: 'from-blue-500 to-cyan-500' },
                      ].map(item => (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-dark-400">{item.label}</span>
                            <span className="text-dark-200 font-mono">{item.gas.toLocaleString()} Gas</span>
                          </div>
                          <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((item.gas / blockchainInfo.gas.deployGasUsed) * 100, 100)}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="glass-card p-8 text-center text-dark-400">
                  <CubeIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>无法加载区块链信息</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

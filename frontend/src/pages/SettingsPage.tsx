import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  CubeIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'
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

const tabs = [
  { id: 'profile', name: '个人信息', icon: UserCircleIcon },
  { id: 'security', name: '安全设置', icon: KeyIcon },
  { id: 'notifications', name: '通知设置', icon: BellIcon },
  { id: 'blockchain', name: '区块链', icon: CubeIcon },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user, updateUser } = useAuthStore()
  const [loading, setLoading] = useState(false)

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
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold">
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

                <div>
                  <label className="input-label">钱包地址</label>
                  <input
                    type="text"
                    {...profileForm.register('walletAddress')}
                    className="input-field font-mono text-sm"
                    placeholder="0x..."
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    用于接收区块链证明的以太坊钱包地址
                  </p>
                </div>

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
                      <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
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
              className="glass-card p-6"
            >
              <h2 className="card-title mb-6">区块链配置</h2>
              
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-dark-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-dark-300">网络状态</span>
                    <span className="flex items-center gap-2 text-emerald-400 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      已连接
                    </span>
                  </div>
                  <p className="text-sm text-dark-500">Ethereum Testnet (Chain ID: 31337)</p>
                </div>

                <div className="p-4 rounded-xl bg-dark-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-dark-300">智能合约</span>
                    <span className="badge-success">
                      <CheckIcon className="w-3 h-3 mr-1" />
                      已部署
                    </span>
                  </div>
                  <p className="blockchain-hash text-xs mt-2">
                    0x5FbDB2315678afecb367f032d93F642f64180aa3
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-dark-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">自动上链</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                  <p className="text-sm text-dark-500 mt-2">
                    开启后，创建证明时自动上链
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

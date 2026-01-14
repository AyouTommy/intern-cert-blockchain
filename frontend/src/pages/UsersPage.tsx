import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  KeyIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api from '../services/api'
import { format } from 'date-fns'
import clsx from 'clsx'

interface User {
  id: string
  email: string
  name: string
  role: string
  phone?: string
  isActive: boolean
  approvalStatus?: string
  applyOrgName?: string
  applyOrgCode?: string
  applyReason?: string
  rejectReason?: string
  createdAt: string
  university?: { id: string; name: string }
  company?: { id: string; name: string }
  studentProfile?: { studentId: string }
}

const roleLabels: Record<string, { label: string; class: string }> = {
  ADMIN: { label: '管理员', class: 'bg-red-500/20 text-red-400' },
  UNIVERSITY: { label: '高校', class: 'bg-blue-500/20 text-blue-400' },
  COMPANY: { label: '企业', class: 'bg-purple-500/20 text-purple-400' },
  STUDENT: { label: '学生', class: 'bg-emerald-500/20 text-emerald-400' },
  THIRD_PARTY: { label: '第三方机构', class: 'bg-orange-500/20 text-orange-400' },
}

const approvalStatusLabels: Record<string, { label: string; class: string }> = {
  PENDING: { label: '待审批', class: 'bg-yellow-500/20 text-yellow-400' },
  APPROVED: { label: '已批准', class: 'bg-green-500/20 text-green-400' },
  REJECTED: { label: '已拒绝', class: 'bg-red-500/20 text-red-400' },
}

type TabType = 'all' | 'pending'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<TabType>('all')

  // 修改密码模态框
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')

  // 审批模态框
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve')
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (activeTab === 'all') {
      fetchUsers()
    } else {
      fetchPendingUsers()
    }
  }, [search, roleFilter, page, activeTab])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('limit', '10')
      if (search) params.append('search', search)
      if (roleFilter) params.append('role', roleFilter)

      const response = await api.get(`/users?${params}`)
      setUsers(response.data.data.users)
      setPagination(response.data.data.pagination)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingUsers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/users/pending')
      setPendingUsers(response.data.data.users || response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch pending users:', error)
      setPendingUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (id: string) => {
    try {
      await api.patch(`/users/${id}/toggle-status`)
      toast.success('用户状态已更新')
      fetchUsers()
    } catch (error) {
      // Error handled by interceptor
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`确定要删除用户 "${user.name}" 吗？此操作不可撤销！`)) {
      return
    }
    try {
      await api.delete(`/users/${user.id}`)
      toast.success('用户已删除')
      if (activeTab === 'all') {
        fetchUsers()
      } else {
        fetchPendingUsers()
      }
    } catch (error) {
      // Error handled by interceptor
    }
  }

  const openPasswordModal = (user: User) => {
    setSelectedUser(user)
    setNewPassword('')
    setShowPasswordModal(true)
  }

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast.error('请输入新密码')
      return
    }
    if (newPassword.length < 6) {
      toast.error('密码至少6个字符')
      return
    }

    try {
      await api.patch(`/users/${selectedUser.id}/reset-password`, { password: newPassword })
      toast.success('密码已重置')
      setShowPasswordModal(false)
      setNewPassword('')
    } catch (error) {
      // Error handled by interceptor
    }
  }

  const openApprovalModal = (user: User, action: 'approve' | 'reject') => {
    setSelectedUser(user)
    setApprovalAction(action)
    setRejectReason('')
    setShowApprovalModal(true)
  }

  const handleApproval = async () => {
    if (!selectedUser) return

    try {
      await api.patch(`/users/${selectedUser.id}/approval`, {
        approved: approvalAction === 'approve',
        rejectReason: approvalAction === 'reject' ? rejectReason : undefined,
      })
      toast.success(approvalAction === 'approve' ? '已批准注册' : '已拒绝注册')
      setShowApprovalModal(false)
      fetchPendingUsers()
    } catch (error) {
      // Error handled by interceptor
    }
  }

  const displayUsers = activeTab === 'all' ? users : pendingUsers

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">用户管理</h1>
        <p className="page-subtitle">管理系统用户账户和注册审批</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700 pb-2">
        <button
          onClick={() => { setActiveTab('all'); setPage(1); }}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === 'all'
              ? 'bg-primary-500/20 text-primary-400'
              : 'text-dark-400 hover:text-dark-200'
          )}
        >
          全部用户
        </button>
        <button
          onClick={() => { setActiveTab('pending'); setPage(1); }}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
            activeTab === 'pending'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'text-dark-400 hover:text-dark-200'
          )}
        >
          <ClockIcon className="w-4 h-4" />
          待审批注册
          {pendingUsers.length > 0 && activeTab !== 'pending' && (
            <span className="px-1.5 py-0.5 bg-yellow-500 text-black rounded-full text-xs">
              {pendingUsers.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters - only for all users tab */}
      {activeTab === 'all' && (
        <div className="glass-card p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                placeholder="搜索用户名或邮箱..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input-field pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-dark-400" />
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="input-field w-36"
              >
                <option value="">全部角色</option>
                <option value="ADMIN">管理员</option>
                <option value="UNIVERSITY">高校</option>
                <option value="COMPANY">企业</option>
                <option value="STUDENT">学生</option>
                <option value="THIRD_PARTY">第三方机构</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="table-header">
              <th className="table-cell text-left">用户</th>
              <th className="table-cell text-left">角色</th>
              <th className="table-cell text-left">{activeTab === 'pending' ? '申请机构' : '所属机构'}</th>
              {activeTab === 'pending' && <th className="table-cell text-left">申请说明</th>}
              <th className="table-cell text-left">注册时间</th>
              <th className="table-cell text-left">状态</th>
              <th className="table-cell text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="table-row">
                  <td colSpan={activeTab === 'pending' ? 7 : 6} className="table-cell">
                    <div className="h-12 skeleton rounded" />
                  </td>
                </tr>
              ))
            ) : displayUsers.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'pending' ? 7 : 6} className="table-cell text-center py-12">
                  <UsersIcon className="w-12 h-12 mx-auto text-dark-600 mb-4" />
                  <p className="text-dark-400">
                    {activeTab === 'pending' ? '暂无待审批的注册申请' : '暂无用户数据'}
                  </p>
                </td>
              </tr>
            ) : (
              displayUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="table-row"
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-medium">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-dark-100">{user.name}</p>
                        <p className="text-sm text-dark-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={clsx(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      roleLabels[user.role]?.class
                    )}>
                      {roleLabels[user.role]?.label || user.role}
                    </span>
                  </td>
                  <td className="table-cell text-dark-300">
                    {activeTab === 'pending'
                      ? (user.applyOrgName || '-')
                      : (user.university?.name || user.company?.name || user.studentProfile?.studentId || '-')
                    }
                    {activeTab === 'pending' && user.applyOrgCode && (
                      <p className="text-xs text-dark-500">{user.applyOrgCode}</p>
                    )}
                  </td>
                  {activeTab === 'pending' && (
                    <td className="table-cell text-dark-400 text-sm max-w-[200px] truncate">
                      {user.applyReason || '-'}
                    </td>
                  )}
                  <td className="table-cell text-dark-400 text-sm">
                    {format(new Date(user.createdAt), 'yyyy/MM/dd')}
                  </td>
                  <td className="table-cell">
                    {activeTab === 'pending' ? (
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        approvalStatusLabels[user.approvalStatus || 'PENDING']?.class
                      )}>
                        <ClockIcon className="w-3 h-3 mr-1 inline" />
                        {approvalStatusLabels[user.approvalStatus || 'PENDING']?.label}
                      </span>
                    ) : user.isActive ? (
                      <span className="badge-success">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        正常
                      </span>
                    ) : (
                      <span className="badge-error">
                        <XCircleIcon className="w-3 h-3 mr-1" />
                        禁用
                      </span>
                    )}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      {activeTab === 'pending' ? (
                        <>
                          <button
                            onClick={() => openApprovalModal(user, 'approve')}
                            className="text-sm px-3 py-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1"
                          >
                            <CheckIcon className="w-4 h-4" />
                            批准
                          </button>
                          <button
                            onClick={() => openApprovalModal(user, 'reject')}
                            className="text-sm px-3 py-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                          >
                            <XMarkIcon className="w-4 h-4" />
                            拒绝
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => openPasswordModal(user)}
                            className="text-sm px-3 py-1 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-1"
                            title="重置密码"
                          >
                            <KeyIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user.id)}
                            className={clsx(
                              'text-sm px-3 py-1 rounded-lg transition-colors',
                              user.isActive
                                ? 'text-red-400 hover:bg-red-500/10'
                                : 'text-emerald-400 hover:bg-emerald-500/10'
                            )}
                          >
                            {user.isActive ? '禁用' : '启用'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-sm px-3 py-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                            title="删除用户"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - only for all users tab */}
      {activeTab === 'all' && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-dark-400">
            共 {pagination.total} 条记录
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-ghost disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-dark-300">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="btn-ghost disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-4">重置密码</h2>
            <p className="text-dark-400 mb-4">
              为用户 <span className="text-white">{selectedUser.name}</span> ({selectedUser.email}) 设置新密码
            </p>
            <div className="space-y-4">
              <div>
                <label className="input-label">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field w-full"
                  placeholder="请输入新密码（至少6位）"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPasswordModal(false)} className="btn-secondary flex-1">
                取消
              </button>
              <button onClick={handleResetPassword} className="btn-primary flex-1">
                确认重置
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-4">
              {approvalAction === 'approve' ? '批准注册' : '拒绝注册'}
            </h2>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">用户</span>
                <span className="text-white">{selectedUser.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">邮箱</span>
                <span className="text-white">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">角色</span>
                <span className={roleLabels[selectedUser.role]?.class}>
                  {roleLabels[selectedUser.role]?.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">申请机构</span>
                <span className="text-white">{selectedUser.applyOrgName}</span>
              </div>
              {selectedUser.applyReason && (
                <div className="text-sm">
                  <span className="text-dark-400 block mb-1">申请说明</span>
                  <span className="text-dark-300">{selectedUser.applyReason}</span>
                </div>
              )}
            </div>

            {approvalAction === 'reject' && (
              <div className="mb-4">
                <label className="input-label">拒绝原因</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="input-field w-full min-h-[80px]"
                  placeholder="请输入拒绝原因..."
                />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowApprovalModal(false)} className="btn-secondary flex-1">
                取消
              </button>
              <button
                onClick={handleApproval}
                className={clsx(
                  'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                  approvalAction === 'approve'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                )}
              >
                {approvalAction === 'approve' ? '确认批准' : '确认拒绝'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
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
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchUsers()
  }, [search, roleFilter, page])

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

  const handleToggleStatus = async (id: string) => {
    try {
      await api.patch(`/users/${id}/toggle-status`)
      toast.success('用户状态已更新')
      fetchUsers()
    } catch (error) {
      // Error handled by interceptor
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">用户管理</h1>
        <p className="page-subtitle">管理系统用户账户</p>
      </div>

      {/* Filters */}
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
              className="input-field w-32"
            >
              <option value="">全部角色</option>
              <option value="ADMIN">管理员</option>
              <option value="UNIVERSITY">高校</option>
              <option value="COMPANY">企业</option>
              <option value="STUDENT">学生</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="table-header">
              <th className="table-cell text-left">用户</th>
              <th className="table-cell text-left">角色</th>
              <th className="table-cell text-left">所属机构</th>
              <th className="table-cell text-left">注册时间</th>
              <th className="table-cell text-left">状态</th>
              <th className="table-cell text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="table-row">
                  <td colSpan={6} className="table-cell">
                    <div className="h-12 skeleton rounded" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-cell text-center py-12">
                  <UsersIcon className="w-12 h-12 mx-auto text-dark-600 mb-4" />
                  <p className="text-dark-400">暂无用户数据</p>
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
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
                    {user.university?.name || user.company?.name || user.studentProfile?.studentId || '-'}
                  </td>
                  <td className="table-cell text-dark-400 text-sm">
                    {format(new Date(user.createdAt), 'yyyy/MM/dd')}
                  </td>
                  <td className="table-cell">
                    {user.isActive ? (
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
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
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
    </div>
  )
}

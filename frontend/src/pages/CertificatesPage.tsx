import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  ArrowUpOnSquareIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api, { Certificate } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { format } from 'date-fns'
import clsx from 'clsx'

const statusConfig: Record<string, { label: string; class: string }> = {
  PENDING: { label: '待上链', class: 'badge-warning' },
  PROCESSING: { label: '处理中', class: 'badge-info' },
  ACTIVE: { label: '已上链', class: 'badge-success' },
  REVOKED: { label: '已撤销', class: 'badge-error' },
  EXPIRED: { label: '已过期', class: 'badge-neutral' },
  FAILED: { label: '上链失败', class: 'badge-error' },
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const { user } = useAuthStore()

  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const page = Number(searchParams.get('page')) || 1

  useEffect(() => {
    fetchCertificates()
  }, [search, status, page])

  const fetchCertificates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('limit', '10')
      if (search) params.append('search', search)
      if (status) params.append('status', status)

      const response = await api.get(`/certificates?${params}`)
      setCertificates(response.data.data.certificates)
      setPagination(response.data.data.pagination)
    } catch (error) {
      console.error('Failed to fetch certificates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchParams((prev) => {
      if (value) {
        prev.set('search', value)
      } else {
        prev.delete('search')
      }
      prev.set('page', '1')
      return prev
    })
  }

  const handleStatusFilter = (value: string) => {
    setSearchParams((prev) => {
      if (value) {
        prev.set('status', value)
      } else {
        prev.delete('status')
      }
      prev.set('page', '1')
      return prev
    })
  }

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      prev.set('page', String(newPage))
      return prev
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.length === certificates.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(certificates.map((c) => c.id))
    }
  }

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleBatchUpchain = async () => {
    if (selectedIds.length === 0) {
      toast.error('请选择要上链的证明')
      return
    }

    setBatchLoading(true)
    try {
      await api.post('/certificates/batch-upchain', { ids: selectedIds })
      toast.success('批量上链成功')
      setSelectedIds([])
      fetchCertificates()
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setBatchLoading(false)
    }
  }

  const handleUpchain = async (id: string) => {
    try {
      await api.post(`/certificates/${id}/upchain`)
      toast.success('上链请求已提交')
      fetchCertificates()
    } catch (error) {
      // Error handled by interceptor
    }
  }

  const canCreate = user?.role === 'ADMIN' || user?.role === 'UNIVERSITY' || user?.role === 'COMPANY'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">实习证明管理</h1>
          <p className="page-subtitle">管理和追踪所有实习证明的状态</p>
        </div>
        {canCreate && (
          <Link to="/certificates/new" className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            创建新证明
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="搜索证明编号、学号、岗位..."
              defaultValue={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-dark-400" />
            <select
              value={status}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="input-field w-40"
            >
              <option value="">全部状态</option>
              <option value="PENDING">待上链</option>
              <option value="PROCESSING">处理中</option>
              <option value="ACTIVE">已上链</option>
              <option value="REVOKED">已撤销</option>
              <option value="FAILED">上链失败</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchCertificates}
            className="btn-ghost flex items-center gap-2"
          >
            <ArrowPathIcon className={clsx('w-5 h-5', loading && 'animate-spin')} />
            刷新
          </button>
        </div>

        {/* Batch Actions */}
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mt-4 pt-4 border-t border-dark-700"
          >
            <span className="text-sm text-dark-300">
              已选择 <span className="text-primary-400 font-medium">{selectedIds.length}</span> 项
            </span>
            <button
              onClick={handleBatchUpchain}
              disabled={batchLoading}
              className="btn-primary py-2 text-sm flex items-center gap-2"
            >
              {batchLoading ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUpOnSquareIcon className="w-4 h-4" />
              )}
              批量上链
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="btn-ghost py-2 text-sm"
            >
              取消选择
            </button>
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="table-container overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="table-header">
              <th className="table-cell w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length === certificates.length && certificates.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500"
                />
              </th>
              <th className="table-cell text-left">证明编号</th>
              <th className="table-cell text-left">学生信息</th>
              <th className="table-cell text-left">企业</th>
              <th className="table-cell text-left">实习岗位</th>
              <th className="table-cell text-left">实习时间</th>
              <th className="table-cell text-left">状态</th>
              <th className="table-cell text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="table-row">
                  <td colSpan={8} className="table-cell">
                    <div className="h-12 skeleton rounded" />
                  </td>
                </tr>
              ))
            ) : certificates.length === 0 ? (
              <tr>
                <td colSpan={8} className="table-cell text-center py-12">
                  <DocumentDuplicateIcon className="w-12 h-12 mx-auto text-dark-600 mb-4" />
                  <p className="text-dark-400">暂无证明数据</p>
                  {canCreate && (
                    <Link to="/certificates/new" className="link mt-2 inline-block">
                      创建第一个证明
                    </Link>
                  )}
                </td>
              </tr>
            ) : (
              certificates.map((cert, index) => (
                <motion.tr
                  key={cert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="table-row"
                >
                  <td className="table-cell">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(cert.id)}
                      onChange={() => handleSelect(cert.id)}
                      className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500"
                    />
                  </td>
                  <td className="table-cell">
                    <div>
                      <p className="font-mono text-sm text-dark-200">{cert.certNumber}</p>
                      {cert.certHash && (
                        <p className="text-xs text-dark-500 mt-1 font-mono truncate max-w-[120px]">
                          {cert.certHash.slice(0, 10)}...
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-dark-100">{cert.student.user.name}</p>
                      <p className="text-sm text-dark-400">{cert.student.studentId}</p>
                    </div>
                  </td>
                  <td className="table-cell">
                    <p className="text-dark-200">{cert.company.name}</p>
                  </td>
                  <td className="table-cell">
                    <p className="text-dark-200">{cert.position}</p>
                  </td>
                  <td className="table-cell">
                    <p className="text-sm text-dark-300">
                      {format(new Date(cert.startDate), 'yyyy/MM/dd')}
                      <span className="mx-1">-</span>
                      {format(new Date(cert.endDate), 'yyyy/MM/dd')}
                    </p>
                  </td>
                  <td className="table-cell">
                    <span className={statusConfig[cert.status]?.class || 'badge-neutral'}>
                      {statusConfig[cert.status]?.label || cert.status}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/certificates/${cert.id}`}
                        className="p-2 text-dark-400 hover:text-primary-400 hover:bg-dark-800 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </Link>
                      {(cert.status === 'PENDING' || cert.status === 'FAILED') && canCreate && (
                        <button
                          onClick={() => handleUpchain(cert.id)}
                          className="p-2 text-dark-400 hover:text-emerald-400 hover:bg-dark-800 rounded-lg transition-colors"
                          title="上链"
                        >
                          <ArrowUpOnSquareIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
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
            共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="btn-ghost disabled:opacity-50"
            >
              上一页
            </button>
            {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={clsx(
                    'w-10 h-10 rounded-lg transition-colors',
                    pageNum === page
                      ? 'bg-primary-500 text-dark-100'
                      : 'text-dark-400 hover:bg-dark-800'
                  )}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => handlePageChange(page + 1)}
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

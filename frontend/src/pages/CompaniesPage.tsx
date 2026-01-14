import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BuildingOffice2Icon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api, { Company } from '../services/api'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    englishName: '',
    industry: '',
    scale: '',
    province: '',
    city: '',
    address: '',
    website: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
  })

  useEffect(() => {
    fetchCompanies()
  }, [search])

  const fetchCompanies = async () => {
    try {
      const params = new URLSearchParams()
      params.append('limit', '50')
      if (search) params.append('search', search)

      const response = await api.get(`/companies?${params}`)
      setCompanies(response.data.data.companies)
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCompany) {
        await api.put(`/companies/${editingCompany.id}`, formData)
        toast.success('企业信息更新成功')
      } else {
        await api.post('/companies', formData)
        toast.success('企业创建成功')
      }
      setShowModal(false)
      setEditingCompany(null)
      resetForm()
      fetchCompanies()
    } catch (error) {
      // Error handled by interceptor
    }
  }

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setFormData({
      code: company.code,
      name: company.name,
      englishName: company.englishName || '',
      industry: company.industry || '',
      scale: company.scale || '',
      province: company.province || '',
      city: company.city || '',
      address: '',
      website: company.website || '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
    })
    setShowModal(true)
  }

  const handleVerify = async (id: string) => {
    try {
      await api.patch(`/companies/${id}/verify`)
      toast.success('企业已验证')
      fetchCompanies()
    } catch (error) {
      // Error handled by interceptor
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      englishName: '',
      industry: '',
      scale: '',
      province: '',
      city: '',
      address: '',
      website: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
    })
  }

  const handleDelete = async (company: Company) => {
    if (!window.confirm(`确定要删除企业 "${company.name}" 吗？此操作不可撤销！`)) {
      return
    }
    try {
      await api.delete(`/companies/${company.id}`)
      toast.success('企业已删除')
      fetchCompanies()
    } catch (error) {
      // Error handled by interceptor
    }
  }

  const industries = [
    '互联网/IT',
    '金融/银行',
    '教育/培训',
    '医疗/健康',
    '制造业',
    '房地产/建筑',
    '零售/电商',
    '物流/运输',
    '其他',
  ]

  const scales = [
    '少于50人',
    '50-200人',
    '200-500人',
    '500-1000人',
    '1000-5000人',
    '5000-10000人',
    '10000人以上',
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">企业管理</h1>
          <p className="page-subtitle">管理合作企业信息</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingCompany(null); setShowModal(true); }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          添加企业
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="搜索企业名称或编码..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-2xl" />
          ))
        ) : companies.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BuildingOffice2Icon className="w-16 h-16 mx-auto text-dark-600 mb-4" />
            <p className="text-dark-400">暂无企业数据</p>
          </div>
        ) : (
          companies.map((company, index) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="glass-card-hover p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <BuildingOffice2Icon className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex items-center gap-2">
                  {company.isVerified && (
                    <span className="badge-success">
                      <CheckBadgeIcon className="w-3 h-3 mr-1" />
                      已验证
                    </span>
                  )}
                  <button
                    onClick={() => handleEdit(company)}
                    className="p-2 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(company)}
                    className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-dark-100 mb-1">
                {company.name}
              </h3>
              {company.industry && (
                <span className="badge-info text-xs">{company.industry}</span>
              )}

              <div className="space-y-2 text-sm mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-dark-500">编码</span>
                  <span className="font-mono text-dark-300">{company.code}</span>
                </div>
                {company.scale && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-500">规模</span>
                    <span className="text-dark-300">{company.scale}</span>
                  </div>
                )}
                {(company.province || company.city) && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-500">地区</span>
                    <span className="text-dark-300">
                      {company.province} {company.city}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-dark-500">证明数</span>
                  <span className="text-dark-300">{company._count?.certificates || 0}</span>
                </div>
              </div>

              {!company.isVerified && (
                <button
                  onClick={() => handleVerify(company.id)}
                  className="w-full mt-4 btn-secondary text-sm"
                >
                  标记为已验证
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay flex items-center justify-center overflow-y-auto py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-content max-w-2xl"
          >
            <h3 className="text-xl font-semibold text-dark-100 mb-6">
              {editingCompany ? '编辑企业' : '添加企业'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">企业编码 *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="input-field"
                    required
                    disabled={!!editingCompany}
                  />
                </div>
                <div>
                  <label className="input-label">企业名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">行业</label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="input-field"
                  >
                    <option value="">请选择</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">企业规模</label>
                  <select
                    value={formData.scale}
                    onChange={(e) => setFormData({ ...formData, scale: e.target.value })}
                    className="input-field"
                  >
                    <option value="">请选择</option>
                    {scales.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">省份</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">城市</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">官网</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="input-field"
                  placeholder="https://"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  {editingCompany ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

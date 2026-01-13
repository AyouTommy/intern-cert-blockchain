import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api, { University } from '../services/api'

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    englishName: '',
    province: '',
    city: '',
    address: '',
    website: '',
  })

  useEffect(() => {
    fetchUniversities()
  }, [search])

  const fetchUniversities = async () => {
    try {
      const params = new URLSearchParams()
      params.append('limit', '50')
      if (search) params.append('search', search)
      
      const response = await api.get(`/universities?${params}`)
      setUniversities(response.data.data.universities)
    } catch (error) {
      console.error('Failed to fetch universities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUniversity) {
        await api.put(`/universities/${editingUniversity.id}`, formData)
        toast.success('高校信息更新成功')
      } else {
        await api.post('/universities', formData)
        toast.success('高校创建成功')
      }
      setShowModal(false)
      setEditingUniversity(null)
      resetForm()
      fetchUniversities()
    } catch (error) {
      // Error handled by interceptor
    }
  }

  const handleEdit = (university: University) => {
    setEditingUniversity(university)
    setFormData({
      code: university.code,
      name: university.name,
      englishName: university.englishName || '',
      province: university.province || '',
      city: university.city || '',
      address: university.address || '',
      website: university.website || '',
    })
    setShowModal(true)
  }

  const handleVerify = async (id: string) => {
    try {
      await api.patch(`/universities/${id}/verify`)
      toast.success('高校已验证')
      fetchUniversities()
    } catch (error) {
      // Error handled by interceptor
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      englishName: '',
      province: '',
      city: '',
      address: '',
      website: '',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">高校管理</h1>
          <p className="page-subtitle">管理合作高校信息</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingUniversity(null); setShowModal(true); }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          添加高校
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="搜索高校名称或编码..."
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
        ) : universities.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BuildingOfficeIcon className="w-16 h-16 mx-auto text-dark-600 mb-4" />
            <p className="text-dark-400">暂无高校数据</p>
          </div>
        ) : (
          universities.map((university, index) => (
            <motion.div
              key={university.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="glass-card-hover p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <BuildingOfficeIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex items-center gap-2">
                  {university.isVerified && (
                    <span className="badge-success">
                      <CheckBadgeIcon className="w-3 h-3 mr-1" />
                      已验证
                    </span>
                  )}
                  <button
                    onClick={() => handleEdit(university)}
                    className="p-2 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-dark-100 mb-1">
                {university.name}
              </h3>
              {university.englishName && (
                <p className="text-sm text-dark-400 mb-3">{university.englishName}</p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-dark-500">编码</span>
                  <span className="font-mono text-dark-300">{university.code}</span>
                </div>
                {(university.province || university.city) && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-500">地区</span>
                    <span className="text-dark-300">
                      {university.province} {university.city}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-dark-500">证明数</span>
                  <span className="text-dark-300">{university._count?.certificates || 0}</span>
                </div>
              </div>

              {!university.isVerified && (
                <button
                  onClick={() => handleVerify(university.id)}
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
        <div className="modal-overlay flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-content max-w-xl"
          >
            <h3 className="text-xl font-semibold text-dark-100 mb-6">
              {editingUniversity ? '编辑高校' : '添加高校'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">高校编码 *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="input-field"
                    required
                    disabled={!!editingUniversity}
                  />
                </div>
                <div>
                  <label className="input-label">高校名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="input-label">英文名称</label>
                <input
                  type="text"
                  value={formData.englishName}
                  onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                  className="input-field"
                />
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
                <label className="input-label">详细地址</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                />
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
                  {editingUniversity ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

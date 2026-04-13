import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BriefcaseIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api from '../services/api'

interface Position {
  id: string
  title: string
  department: string
  description: string
  isActive: boolean
  createdAt: string
}

/**
 * #24 R-COM 企业岗位管理
 * 企业预设岗位，学生申请时可选择
 */
export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', department: '', description: '' })

  useEffect(() => {
    fetchPositions()
  }, [])

  const fetchPositions = async () => {
    try {
      const res = await api.get('/positions')
      setPositions(res.data.data || [])
    } catch {
      // 如果API未就绪，用空数组
      setPositions([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('请填写岗位名称')
      return
    }
    try {
      if (editingId) {
        await api.put(`/positions/${editingId}`, form)
        toast.success('岗位已更新')
      } else {
        await api.post('/positions', form)
        toast.success('岗位已创建')
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ title: '', department: '', description: '' })
      fetchPositions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败')
    }
  }

  const handleEdit = (pos: Position) => {
    setForm({ title: pos.title, department: pos.department, description: pos.description })
    setEditingId(pos.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此岗位？')) return
    try {
      await api.delete(`/positions/${id}`)
      toast.success('已删除')
      fetchPositions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">岗位管理</h1>
          <p className="page-subtitle">预设实习岗位，学生申请时可选择</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: '', department: '', description: '' }) }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          新增岗位
        </button>
      </div>

      {/* 新增/编辑表单 */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 space-y-4"
        >
          <h3 className="font-semibold text-dark-100">{editingId ? '编辑岗位' : '新增岗位'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">岗位名称 *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field"
                placeholder="如：前端开发实习生"
              />
            </div>
            <div>
              <label className="input-label">所属部门</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))}
                className="input-field"
                placeholder="如：技术部"
              />
            </div>
          </div>
          <div>
            <label className="input-label">岗位描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field min-h-[80px]"
              placeholder="岗位职责和要求..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-secondary">
              取消
            </button>
            <button onClick={handleSave} className="btn-primary">
              {editingId ? '保存修改' : '创建岗位'}
            </button>
          </div>
        </motion.div>
      )}

      {/* 岗位列表 */}
      {loading ? (
        <div className="text-center py-12 text-dark-400">加载中...</div>
      ) : positions.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <BriefcaseIcon className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">暂无预设岗位</p>
          <p className="text-sm text-dark-500 mt-1">点击"新增岗位"开始添加</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {positions.map((pos, i) => (
            <motion.div
              key={pos.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 flex items-center justify-between group hover:border-primary-500/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  <BriefcaseIcon className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h4 className="font-medium text-dark-100">{pos.title}</h4>
                  <div className="flex items-center gap-3 text-sm text-dark-400">
                    {pos.department && <span>{pos.department}</span>}
                    {pos.description && <span className="truncate max-w-[300px]">{pos.description}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(pos)}
                  className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <PencilIcon className="w-4 h-4 text-dark-400" />
                </button>
                <button
                  onClick={() => handleDelete(pos.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <TrashIcon className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

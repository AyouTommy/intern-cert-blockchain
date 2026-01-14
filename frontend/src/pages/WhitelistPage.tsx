import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    PlusIcon,
    TrashIcon,
    ArrowUpTrayIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api from '../services/api'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

interface WhitelistEntry {
    id: string
    studentId: string
    name: string
    major?: string
    department?: string
    enrollmentYear?: number
    isUsed: boolean
    university?: { id: string; name: string }
    createdAt: string
}

interface University {
    id: string
    code: string
    name: string
}

export default function WhitelistPage() {
    const [entries, setEntries] = useState<WhitelistEntry[]>([])
    const [universities, setUniversities] = useState<University[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showBatchModal, setShowBatchModal] = useState(false)
    const [selectedUniversity, setSelectedUniversity] = useState('')

    // 表单状态
    const [formData, setFormData] = useState({
        studentId: '',
        name: '',
        major: '',
        department: '',
        enrollmentYear: '',
        universityId: '',
    })

    // 批量导入状态
    const [batchData, setBatchData] = useState('')
    const [batchUniversityId, setBatchUniversityId] = useState('')

    // 删除确认模态框状态
    const [deletingEntry, setDeletingEntry] = useState<WhitelistEntry | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        fetchWhitelist()
        fetchUniversities()
    }, [page, search, selectedUniversity])

    const fetchWhitelist = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                ...(search && { search }),
                ...(selectedUniversity && { universityId: selectedUniversity }),
            })
            const response = await api.get(`/whitelist?${params}`)
            if (response.data.success) {
                setEntries(response.data.data.whitelist)
                setTotalPages(response.data.data.pagination.totalPages)
            }
        } catch (error) {
            toast.error('加载白名单失败')
        } finally {
            setLoading(false)
        }
    }

    const fetchUniversities = async () => {
        try {
            const response = await api.get('/universities')
            if (response.data.success) {
                setUniversities(response.data.data.universities || response.data.data || [])
            }
        } catch (error) {
            console.error('加载高校列表失败')
        }
    }

    const handleAddSingle = async () => {
        if (!formData.studentId || !formData.name) {
            toast.error('请填写学号和姓名')
            return
        }

        try {
            const response = await api.post('/whitelist', {
                ...formData,
                enrollmentYear: formData.enrollmentYear ? parseInt(formData.enrollmentYear) : null,
            })
            if (response.data.success) {
                toast.success('添加成功')
                setShowAddModal(false)
                setFormData({ studentId: '', name: '', major: '', department: '', enrollmentYear: '', universityId: '' })
                fetchWhitelist()
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || '添加失败')
        }
    }

    const handleBatchImport = async () => {
        if (!batchData.trim()) {
            toast.error('请输入学生数据')
            return
        }

        try {
            // 解析批量数据：每行一个学生，格式：学号,姓名,专业,院系,入学年份
            const lines = batchData.trim().split('\n')
            const students = lines.map(line => {
                const [studentId, name, major, department, enrollmentYear] = line.split(/[,\t]/).map(s => s.trim())
                return { studentId, name, major, department, enrollmentYear: enrollmentYear ? parseInt(enrollmentYear) : null }
            }).filter(s => s.studentId && s.name)

            if (students.length === 0) {
                toast.error('没有有效的学生数据')
                return
            }

            const response = await api.post('/whitelist/batch', {
                students,
                universityId: batchUniversityId || null,
            })

            if (response.data.success) {
                toast.success(response.data.message)
                setShowBatchModal(false)
                setBatchData('')
                fetchWhitelist()
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || '批量导入失败')
        }
    }

    const handleDelete = async (entry: WhitelistEntry) => {
        setDeletingEntry(entry)
    }

    const confirmDelete = async () => {
        if (!deletingEntry) return
        setIsDeleting(true)
        try {
            const response = await api.delete(`/whitelist/${deletingEntry.id}`)
            if (response.data.success) {
                toast.success('删除成功')
                fetchWhitelist()
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || '删除失败')
        } finally {
            setIsDeleting(false)
            setDeletingEntry(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-white">学生白名单管理</h1>
                    <p className="text-dark-400 mt-1">管理可注册的学生学号列表</p>
                </div>
                <div className="flex gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowBatchModal(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <ArrowUpTrayIcon className="w-5 h-5" />
                        批量导入
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <PlusIcon className="w-5 h-5" />
                        添加学生
                    </motion.button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                        <input
                            type="text"
                            placeholder="搜索学号或姓名..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field pl-10 w-full"
                        />
                    </div>
                </div>
                <select
                    value={selectedUniversity}
                    onChange={(e) => setSelectedUniversity(e.target.value)}
                    className="input-field min-w-[200px]"
                >
                    <option value="">所有高校</option>
                    {universities.map(uni => (
                        <option key={uni.id} value={uni.id}>{uni.name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-dark-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">学号</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">姓名</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">专业</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">高校</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">状态</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">添加时间</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-dark-400">
                                        加载中...
                                    </td>
                                </tr>
                            ) : entries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-dark-400">
                                        暂无数据
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-dark-800/30">
                                        <td className="px-4 py-3 text-sm font-mono text-white">{entry.studentId}</td>
                                        <td className="px-4 py-3 text-sm text-white">{entry.name}</td>
                                        <td className="px-4 py-3 text-sm text-dark-300">{entry.major || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-dark-300">{entry.university?.name || '-'}</td>
                                        <td className="px-4 py-3">
                                            {entry.isUsed ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                                    已注册
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-dark-600 text-dark-300">
                                                    <XCircleIcon className="w-3.5 h-3.5" />
                                                    未使用
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-dark-400">
                                            {new Date(entry.createdAt).toLocaleDateString('zh-CN')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {!entry.isUsed && (
                                                <button
                                                    onClick={() => handleDelete(entry)}
                                                    className="text-red-400 hover:text-red-300 p-1"
                                                    title="删除"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-dark-700 flex items-center justify-between">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn-secondary text-sm disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <span className="text-dark-400 text-sm">
                            第 {page} / {totalPages} 页
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="btn-secondary text-sm disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                )}
            </div>

            {/* Add Single Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-6 w-full max-w-md"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">添加学生</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="input-label">学号 *</label>
                                <input
                                    type="text"
                                    value={formData.studentId}
                                    onChange={(e) => setFormData(f => ({ ...f, studentId: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="输入学号"
                                />
                            </div>
                            <div>
                                <label className="input-label">姓名 *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="输入姓名"
                                />
                            </div>
                            <div>
                                <label className="input-label">专业</label>
                                <input
                                    type="text"
                                    value={formData.major}
                                    onChange={(e) => setFormData(f => ({ ...f, major: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="输入专业"
                                />
                            </div>
                            <div>
                                <label className="input-label">院系</label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => setFormData(f => ({ ...f, department: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="输入院系"
                                />
                            </div>
                            <div>
                                <label className="input-label">入学年份</label>
                                <input
                                    type="number"
                                    value={formData.enrollmentYear}
                                    onChange={(e) => setFormData(f => ({ ...f, enrollmentYear: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="如：2024"
                                />
                            </div>
                            <div>
                                <label className="input-label">所属高校</label>
                                <select
                                    value={formData.universityId}
                                    onChange={(e) => setFormData(f => ({ ...f, universityId: e.target.value }))}
                                    className="input-field w-full"
                                >
                                    <option value="">请选择</option>
                                    {universities.map(uni => (
                                        <option key={uni.id} value={uni.id}>{uni.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="btn-secondary flex-1"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleAddSingle}
                                className="btn-primary flex-1"
                            >
                                添加
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Batch Import Modal */}
            {showBatchModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-6 w-full max-w-2xl"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">批量导入</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="input-label">所属高校（可选）</label>
                                <select
                                    value={batchUniversityId}
                                    onChange={(e) => setBatchUniversityId(e.target.value)}
                                    className="input-field w-full"
                                >
                                    <option value="">不指定</option>
                                    {universities.map(uni => (
                                        <option key={uni.id} value={uni.id}>{uni.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">学生数据</label>
                                <p className="text-xs text-dark-400 mb-2">
                                    每行一个学生，格式：学号,姓名,专业,院系,入学年份（用逗号或Tab分隔）
                                </p>
                                <textarea
                                    value={batchData}
                                    onChange={(e) => setBatchData(e.target.value)}
                                    className="input-field w-full min-h-[200px] font-mono text-sm"
                                    placeholder={`202420611001,张三,计算机科学与技术,计算机学院,2024
202420611002,李四,软件工程,计算机学院,2024
202420611003,王五,人工智能,计算机学院,2024`}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowBatchModal(false)}
                                className="btn-secondary flex-1"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleBatchImport}
                                className="btn-primary flex-1"
                            >
                                导入
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={!!deletingEntry}
                title="确认删除"
                message={`确定要删除学生 "${deletingEntry?.name}"(${deletingEntry?.studentId}) 的白名单记录吗？`}
                onConfirm={confirmDelete}
                onCancel={() => setDeletingEntry(null)}
                isLoading={isDeleting}
            />
        </div>
    )
}

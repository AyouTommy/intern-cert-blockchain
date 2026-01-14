import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    BuildingStorefrontIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    CheckBadgeIcon,
    PencilIcon,
    TrashIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api from '../services/api'

interface ThirdPartyOrg {
    id: string
    code: string
    name: string
    type: string
    website?: string
    isVerified: boolean
}

const typeLabels: Record<string, string> = {
    GOVERNMENT: '政府机构',
    ENTERPRISE: '企业协会',
    EDUCATION: '教育机构',
    OTHER: '其他',
}

export default function ThirdPartyOrgsPage() {
    const [orgs, setOrgs] = useState<ThirdPartyOrg[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingOrg, setEditingOrg] = useState<ThirdPartyOrg | null>(null)
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'OTHER',
        website: '',
    })

    useEffect(() => {
        fetchOrgs()
    }, [search])

    const fetchOrgs = async () => {
        try {
            const params = new URLSearchParams()
            params.append('limit', '50')
            if (search) params.append('search', search)

            const response = await api.get(`/third-party-orgs?${params}`)
            setOrgs(response.data.data.orgs)
        } catch (error) {
            console.error('Failed to fetch third party orgs:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingOrg) {
                await api.put(`/third-party-orgs/${editingOrg.id}`, formData)
                toast.success('机构信息更新成功')
            } else {
                await api.post('/third-party-orgs', formData)
                toast.success('机构创建成功')
            }
            setShowModal(false)
            setEditingOrg(null)
            resetForm()
            fetchOrgs()
        } catch (error) {
            // Error handled by interceptor
        }
    }

    const handleEdit = (org: ThirdPartyOrg) => {
        setEditingOrg(org)
        setFormData({
            code: org.code,
            name: org.name,
            type: org.type,
            website: org.website || '',
        })
        setShowModal(true)
    }

    const handleDelete = async (org: ThirdPartyOrg) => {
        if (!window.confirm(`确定要删除机构 "${org.name}" 吗？此操作不可撤销！`)) {
            return
        }
        try {
            await api.delete(`/third-party-orgs/${org.id}`)
            toast.success('机构已删除')
            fetchOrgs()
        } catch (error) {
            // Error handled by interceptor
        }
    }

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            type: 'OTHER',
            website: '',
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="page-title">第三方机构管理</h1>
                    <p className="page-subtitle">管理验证机构和合作伙伴</p>
                </div>
                <button
                    onClick={() => { resetForm(); setEditingOrg(null); setShowModal(true); }}
                    className="btn-primary inline-flex items-center gap-2"
                >
                    <PlusIcon className="w-5 h-5" />
                    添加机构
                </button>
            </div>

            {/* Search */}
            <div className="glass-card p-4">
                <div className="relative max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                        type="text"
                        placeholder="搜索机构名称或编码..."
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
                ) : orgs.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <BuildingStorefrontIcon className="w-16 h-16 mx-auto text-dark-600 mb-4" />
                        <p className="text-dark-400">暂无第三方机构数据</p>
                    </div>
                ) : (
                    orgs.map((org, index) => (
                        <motion.div
                            key={org.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="glass-card-hover p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                    <BuildingStorefrontIcon className="w-6 h-6 text-orange-400" />
                                </div>
                                <div className="flex items-center gap-2">
                                    {org.isVerified && (
                                        <span className="badge-success">
                                            <CheckBadgeIcon className="w-3 h-3 mr-1" />
                                            已验证
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleEdit(org)}
                                        className="p-2 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(org)}
                                        className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold text-dark-100 mb-1">
                                {org.name}
                            </h3>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-dark-500">编码</span>
                                    <span className="font-mono text-dark-300">{org.code}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-dark-500">类型</span>
                                    <span className="text-dark-300">{typeLabels[org.type] || org.type}</span>
                                </div>
                                {org.website && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-dark-500">官网</span>
                                        <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline truncate max-w-[150px]">
                                            {org.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    </div>
                                )}
                            </div>
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
                            {editingOrg ? '编辑机构' : '添加机构'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label">机构编码 *</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="input-field"
                                        required
                                        disabled={!!editingOrg}
                                    />
                                </div>
                                <div>
                                    <label className="input-label">机构名称 *</label>
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
                                <label className="input-label">机构类型</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="GOVERNMENT">政府机构</option>
                                    <option value="ENTERPRISE">企业协会</option>
                                    <option value="EDUCATION">教育机构</option>
                                    <option value="OTHER">其他</option>
                                </select>
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
                                    {editingOrg ? '保存' : '创建'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

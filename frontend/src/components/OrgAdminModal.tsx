import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    XMarkIcon,
    PlusIcon,
    UserIcon,
    KeyIcon,
    NoSymbolIcon,
    CheckCircleIcon,
    TrashIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../services/api'

interface OrgAdmin {
    id: string
    email: string
    name: string
    phone?: string
    isActive: boolean
    createdAt: string
}

interface OrgAdminModalProps {
    isOpen: boolean
    onClose: () => void
    orgType: 'university' | 'company' | 'thirdParty'
    orgId: string
    orgName: string
}

export default function OrgAdminModal({
    isOpen,
    onClose,
    orgType,
    orgId,
    orgName,
}: OrgAdminModalProps) {
    const [admins, setAdmins] = useState<OrgAdmin[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        phone: '',
    })
    const [showResetPassword, setShowResetPassword] = useState<string | null>(null)
    const [newPassword, setNewPassword] = useState('')

    useEffect(() => {
        if (isOpen) {
            fetchAdmins()
        }
    }, [isOpen, orgId])

    const fetchAdmins = async () => {
        setLoading(true)
        try {
            let endpoint = ''
            switch (orgType) {
                case 'university':
                    endpoint = `/org-admins/university/${orgId}`
                    break
                case 'company':
                    endpoint = `/org-admins/company/${orgId}`
                    break
                case 'thirdParty':
                    endpoint = `/org-admins/third-party/${orgId}`
                    break
            }
            const response = await api.get(endpoint)
            setAdmins(response.data.data.admins)
        } catch (error) {
            console.error('Failed to fetch admins:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            await api.post('/org-admins', {
                ...formData,
                orgType,
                orgId,
            })
            toast.success('管理员创建成功')
            setShowAddForm(false)
            setFormData({ email: '', password: '', name: '', phone: '' })
            fetchAdmins()
        } catch (error) {
            // Error handled by interceptor
        } finally {
            setSubmitting(false)
        }
    }

    const handleToggleStatus = async (userId: string, isActive: boolean) => {
        try {
            await api.patch(`/org-admins/${userId}/toggle-status`)
            toast.success(isActive ? '管理员已禁用' : '管理员已启用')
            fetchAdmins()
        } catch (error) {
            // Error handled by interceptor
        }
    }

    const handleResetPassword = async (userId: string) => {
        if (!newPassword || newPassword.length < 6) {
            toast.error('密码至少需要6个字符')
            return
        }
        try {
            await api.patch(`/org-admins/${userId}/reset-password`, {
                password: newPassword,
            })
            toast.success('密码已重置')
            setShowResetPassword(null)
            setNewPassword('')
        } catch (error) {
            // Error handled by interceptor
        }
    }

    const handleDelete = async (userId: string, name: string) => {
        if (!confirm(`确定要删除管理员 "${name}" 吗？此操作不可撤销！`)) {
            return
        }
        try {
            await api.delete(`/org-admins/${userId}`)
            toast.success('管理员已删除')
            fetchAdmins()
        } catch (error) {
            // Error handled by interceptor
        }
    }

    const getOrgTypeName = () => {
        switch (orgType) {
            case 'university': return '高校'
            case 'company': return '企业'
            case 'thirdParty': return '第三方机构'
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="modal-content max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <div>
                        <h3 className="text-xl font-semibold text-dark-100">
                            {orgName} - 管理员账户
                        </h3>
                        <p className="text-sm text-dark-400 mt-1">
                            管理{getOrgTypeName()}的管理员账户
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Add Admin Button */}
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full mb-4 btn-secondary flex items-center justify-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            添加管理员
                        </button>
                    )}

                    {/* Add Admin Form */}
                    <AnimatePresence>
                        {showAddForm && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                onSubmit={handleAddAdmin}
                                className="mb-6 p-4 bg-dark-800/50 rounded-xl space-y-4"
                            >
                                <h4 className="font-medium text-dark-100">添加新管理员</h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="input-label">姓名 *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">邮箱 *</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">密码 *</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="input-field"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">手机号</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="input-field"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddForm(false)
                                            setFormData({ email: '', password: '', name: '', phone: '' })
                                        }}
                                        className="btn-secondary"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn-primary"
                                    >
                                        {submitting ? '创建中...' : '创建管理员'}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Admin List */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-20 skeleton rounded-xl" />
                            ))}
                        </div>
                    ) : admins.length === 0 ? (
                        <div className="text-center py-12">
                            <UserIcon className="w-16 h-16 mx-auto text-dark-600 mb-4" />
                            <p className="text-dark-400">暂无管理员账户</p>
                            <p className="text-sm text-dark-500 mt-1">
                                点击上方按钮添加管理员
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {admins.map((admin) => (
                                <div
                                    key={admin.id}
                                    className="p-4 bg-dark-800/50 rounded-xl"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                                                <UserIcon className="w-5 h-5 text-primary-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-dark-100">{admin.name}</span>
                                                    {admin.isActive ? (
                                                        <span className="badge-success text-xs">启用</span>
                                                    ) : (
                                                        <span className="badge-error text-xs">禁用</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-dark-400">{admin.email}</p>
                                                {admin.phone && (
                                                    <p className="text-sm text-dark-500">{admin.phone}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleToggleStatus(admin.id, admin.isActive)}
                                                className={`p-2 rounded-lg transition-colors ${admin.isActive
                                                        ? 'text-dark-400 hover:text-yellow-400 hover:bg-yellow-500/10'
                                                        : 'text-dark-400 hover:text-green-400 hover:bg-green-500/10'
                                                    }`}
                                                title={admin.isActive ? '禁用' : '启用'}
                                            >
                                                {admin.isActive ? (
                                                    <NoSymbolIcon className="w-4 h-4" />
                                                ) : (
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setShowResetPassword(admin.id)}
                                                className="p-2 text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                                                title="重置密码"
                                            >
                                                <KeyIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(admin.id, admin.name)}
                                                className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                                title="删除"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Reset Password Form */}
                                    <AnimatePresence>
                                        {showResetPassword === admin.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-4 pt-4 border-t border-dark-700"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        placeholder="输入新密码（至少6位）"
                                                        className="input-field flex-1"
                                                    />
                                                    <button
                                                        onClick={() => handleResetPassword(admin.id)}
                                                        className="btn-primary text-sm"
                                                    >
                                                        确认重置
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowResetPassword(null)
                                                            setNewPassword('')
                                                        }}
                                                        className="btn-secondary text-sm"
                                                    >
                                                        取消
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <p className="text-xs text-dark-500 mt-2">
                                        创建于 {format(new Date(admin.createdAt), 'yyyy-MM-dd HH:mm')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-dark-700 flex justify-end">
                    <button onClick={onClose} className="btn-secondary">
                        关闭
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

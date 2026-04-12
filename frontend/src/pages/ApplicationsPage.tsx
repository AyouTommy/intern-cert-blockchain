import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    PlusIcon,
    EyeIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    DocumentTextIcon,
    BuildingOfficeIcon,
    TrashIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

interface Application {
    id: string
    applicationNo: string
    position: string
    department?: string
    startDate: string
    endDate: string
    status: string
    description?: string
    companyScore?: number
    companyEvaluation?: string
    student: { studentId: string; user: { name: string } }
    company: { id: string; name: string }
    university: { id: string; name: string }
    certificate?: { id: string; certNumber: string; status: string }
    createdAt: string
}

interface Company {
    id: string
    name: string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
    DRAFT: { label: '草稿', color: 'text-gray-400 bg-gray-500/20', icon: DocumentTextIcon },
    SUBMITTED: { label: '待企业评价', color: 'text-yellow-400 bg-yellow-500/20', icon: ClockIcon },
    COMPANY_REVIEWING: { label: '企业评价中', color: 'text-blue-400 bg-blue-500/20', icon: ClockIcon },
    COMPANY_APPROVED: { label: '待高校审核', color: 'text-purple-400 bg-purple-500/20', icon: ClockIcon },
    UNIVERSITY_REVIEWING: { label: '高校审核中', color: 'text-indigo-400 bg-indigo-500/20', icon: ClockIcon },
    APPROVED: { label: '已通过', color: 'text-green-400 bg-green-500/20', icon: CheckCircleIcon },
    REJECTED: { label: '已拒绝', color: 'text-red-400 bg-red-500/20', icon: XCircleIcon },
    WITHDRAWN: { label: '已撤回', color: 'text-gray-400 bg-gray-500/20', icon: XCircleIcon },
}

export default function ApplicationsPage() {
    const { user } = useAuthStore()
    const [applications, setApplications] = useState<Application[]>([])
    const [companies, setCompanies] = useState<Company[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [statusFilter, setStatusFilter] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [deletingApp, setDeletingApp] = useState<Application | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [selectedApp, setSelectedApp] = useState<Application | null>(null)

    // 创建表单状态
    const [formData, setFormData] = useState({
        companyId: '',
        position: '',
        department: '',
        startDate: '',
        endDate: '',
        description: '',
    })

    // 企业评价表单
    const [reviewData, setReviewData] = useState({
        score: 80,
        evaluation: '',
        approved: true,
        rejectReason: '',
    })

    // 高校审核表单
    const [approvalData, setApprovalData] = useState({
        approved: true,
        approval: '',
        rejectReason: '',
        autoUpchain: true,
    })

    useEffect(() => {
        fetchApplications()
        if (user?.role === 'STUDENT') {
            fetchCompanies()
        }
    }, [page, statusFilter])

    const fetchApplications = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                ...(statusFilter && { status: statusFilter }),
            })
            const response = await api.get(`/applications?${params}`)
            if (response.data.success) {
                setApplications(response.data.data.applications)
                setTotalPages(response.data.data.pagination.totalPages)
            }
        } catch (error) {
            toast.error('加载申请列表失败')
        } finally {
            setLoading(false)
        }
    }

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/companies')
            if (response.data.success) {
                setCompanies(response.data.data.companies || response.data.data || [])
            }
        } catch (error) {
            console.error('加载企业列表失败')
        }
    }

    const handleCreate = async () => {
        if (!formData.companyId || !formData.position || !formData.startDate || !formData.endDate) {
            toast.error('请填写必填项')
            return
        }

        try {
            const response = await api.post('/applications', formData)
            if (response.data.success) {
                toast.success('申请已创建')
                setShowCreateModal(false)
                setFormData({ companyId: '', position: '', department: '', startDate: '', endDate: '', description: '' })
                fetchApplications()
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || '创建失败')
        }
    }

    const handleSubmit = async (id: string) => {
        try {
            const response = await api.post(`/applications/${id}/submit`)
            if (response.data.success) {
                toast.success('申请已提交')
                fetchApplications()
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || '提交失败')
        }
    }

    const handleWithdraw = async (id: string) => {
        if (!confirm('确定要撤回此申请吗？')) return
        try {
            const response = await api.post(`/applications/${id}/withdraw`)
            if (response.data.success) {
                toast.success('申请已撤回')
                fetchApplications()
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || '撤回失败')
        }
    }

    //! 【前端 → 后端】企业评价签章: 发请求到后端 /applications/申请ID/company-review
    // 参数: 评分, 评语, 是否通过
    // 后端收到后: 生成签章 → 更新状态 → 通知高校和学生
    const handleCompanyReview = async (isApproved: boolean) => {
        if (!selectedApp) return
        if (isApproved && !reviewData.evaluation) {
            toast.error('请填写评语')
            return
        }
        try {
            const response = await api.post(`/applications/${selectedApp.id}/company-review`, {
                score: reviewData.score,
                evaluation: reviewData.evaluation,
                approved: isApproved,
                rejectReason: reviewData.rejectReason,
            })
            if (response.data.success) {
                toast.success(isApproved ? '评价已完成' : '已拒绝申请')
                setShowDetailModal(false)
                fetchApplications()
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || '操作失败')
        }
    }

    //! 【前端 → 后端】高校审核: 发请求到后端 /applications/申请ID/university-review
    // 参数: 是否通过, 是否自动上链
    // 后端收到后: 生成证书 → 生成二维码 → 写入数据库 → 异步上链
    const handleUniversityReview = async (isApproved: boolean) => {
        if (!selectedApp) return
        try {
            const response = await api.post(`/applications/${selectedApp.id}/university-review`, {
                ...approvalData,
                approved: isApproved,
            })
            if (response.data.success) {
                toast.success(isApproved ? '审核通过，证书已创建并发起链上确认' : '已拒绝申请')
                setShowDetailModal(false)
                fetchApplications()
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || '操作失败')
        }
    }

    const openDetail = (app: Application) => {
        setSelectedApp(app)
        setReviewData({ score: 80, evaluation: '', approved: true, rejectReason: '' })
        setApprovalData({ approved: true, approval: '', rejectReason: '', autoUpchain: true })
        setShowDetailModal(true)
    }

    // 删除申请
    const handleDeleteApp = (app: Application) => {
        setDeletingApp(app)
    }

    const confirmDeleteApp = async () => {
        if (!deletingApp) return
        setDeleteLoading(true)
        try {
            const response = await api.delete(`/applications/${deletingApp.id}`)
            toast.success(response.data.message || '申请已删除')
            setDeletingApp(null)
            fetchApplications()
        } catch (error: any) {
            toast.error(error.response?.data?.message || '删除失败')
        } finally {
            setDeleteLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const config = statusConfig[status] || statusConfig.DRAFT
        const Icon = config.icon
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
                {config.label}
            </span>
        )
    }

    const isStudent = user?.role === 'STUDENT'
    const isCompany = user?.role === 'COMPANY'
    const isUniversity = user?.role === 'UNIVERSITY' || user?.role === 'ADMIN'
    const isAdmin = user?.role === 'ADMIN'

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-dark-100">
                        {isStudent ? '我的申请' : isCompany ? '待评价申请' : '待审核申请'}
                    </h1>
                    <p className="text-dark-400 mt-1">
                        {isStudent ? '管理您的实习证明申请' : isCompany ? '评价学生实习表现' : '审核实习证明申请'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => fetchApplications()}
                        className="btn-secondary flex items-center gap-2"
                        title="刷新列表"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        刷新
                    </motion.button>
                    {isStudent && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowCreateModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            新建申请
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap gap-4">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field min-w-[200px]"
                >
                    <option value="">所有状态</option>
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Application List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="glass-card p-8 text-center text-dark-400">加载中...</div>
                ) : applications.length === 0 ? (
                    <div className="glass-card p-8 text-center text-dark-400">
                        暂无申请
                        {isStudent && (
                            <p className="mt-2">
                                <button onClick={() => setShowCreateModal(true)} className="text-primary-400 hover:text-primary-300">
                                    创建第一个申请
                                </button>
                            </p>
                        )}
                    </div>
                ) : (
                    applications.map((app) => (
                        <motion.div
                            key={app.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card p-4"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-dark-100">{app.position}</h3>
                                        {getStatusBadge(app.status)}
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-dark-400">
                                        <span className="flex items-center gap-1">
                                            <BuildingOfficeIcon className="w-4 h-4" />
                                            {app.company.name}
                                        </span>
                                        <span>申请编号：{app.applicationNo}</span>
                                        <span>
                                            实习期：{new Date(app.startDate).toLocaleDateString('zh-CN')} - {new Date(app.endDate).toLocaleDateString('zh-CN')}
                                        </span>
                                    </div>
                                    {app.companyScore && (
                                        <div className="mt-2 text-sm">
                                            <span className="text-dark-400">企业评分：</span>
                                            <span className="text-primary-400 font-medium">{app.companyScore}分</span>
                                        </div>
                                    )}
                                    {app.certificate && (
                                        <div className="mt-2">
                                            <Link
                                                to={`/certificates/${app.certificate.id}`}
                                                className="text-sm text-primary-400 hover:text-primary-300"
                                            >
                                                查看证书 →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {isStudent && app.status === 'DRAFT' && (
                                        <>
                                            <button
                                                onClick={() => handleSubmit(app.id)}
                                                className="btn-primary text-sm"
                                            >
                                                提交
                                            </button>
                                        </>
                                    )}
                                    {isStudent && ['SUBMITTED', 'COMPANY_REVIEWING'].includes(app.status) && (
                                        <button
                                            onClick={() => handleWithdraw(app.id)}
                                            className="btn-secondary text-sm"
                                        >
                                            撤回
                                        </button>
                                    )}
                                    {(isCompany || isUniversity) && (
                                        <button
                                            onClick={() => openDetail(app)}
                                            className="btn-secondary text-sm flex items-center gap-1"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                            {isCompany && ['SUBMITTED', 'COMPANY_REVIEWING'].includes(app.status) ? '评价' :
                                                isUniversity && ['COMPANY_APPROVED', 'UNIVERSITY_REVIEWING'].includes(app.status) ? '审核' : '查看'}
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleDeleteApp(app)}
                                            className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="删除申请"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="btn-secondary text-sm disabled:opacity-50"
                    >
                        上一页
                    </button>
                    <span className="text-dark-400">第 {page} / {totalPages} 页</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="btn-secondary text-sm disabled:opacity-50"
                    >
                        下一页
                    </button>
                </div>
            )}

            {/* Create Modal (Student) */}
            {showCreateModal && isStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-6 w-full max-w-md"
                    >
                        <h2 className="text-xl font-bold text-dark-100 mb-4">新建实习证明申请</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="input-label">实习企业 *</label>
                                <select
                                    value={formData.companyId}
                                    onChange={(e) => setFormData(f => ({ ...f, companyId: e.target.value }))}
                                    className="input-field w-full"
                                >
                                    <option value="">请选择企业</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">实习岗位 *</label>
                                <input
                                    type="text"
                                    value={formData.position}
                                    onChange={(e) => setFormData(f => ({ ...f, position: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="如：软件开发实习生"
                                />
                            </div>
                            <div>
                                <label className="input-label">实习部门</label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => setFormData(f => ({ ...f, department: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="如：技术研发部"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="input-label">开始日期 *</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData(f => ({ ...f, startDate: e.target.value }))}
                                        className="input-field w-full"
                                    />
                                </div>
                                <div>
                                    <label className="input-label">结束日期 *</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData(f => ({ ...f, endDate: e.target.value }))}
                                        className="input-field w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="input-label">实习内容描述</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                                    className="input-field w-full min-h-[100px]"
                                    placeholder="请描述您的实习工作内容..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">取消</button>
                            <button onClick={handleCreate} className="btn-primary flex-1">创建</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Detail/Review Modal */}
            {showDetailModal && selectedApp && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-6 w-full max-w-lg mx-4"
                    >
                        <h2 className="text-xl font-bold text-dark-100 mb-4">申请详情</h2>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">申请编号</span>
                                <span className="text-dark-100">{selectedApp.applicationNo}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">学生姓名</span>
                                <span className="text-dark-100">{selectedApp.student.user.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">学号</span>
                                <span className="text-dark-100 font-mono">{selectedApp.student.studentId}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">实习企业</span>
                                <span className="text-dark-100">{selectedApp.company.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">实习岗位</span>
                                <span className="text-dark-100">{selectedApp.position}</span>
                            </div>
                            {selectedApp.department && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-dark-400">实习部门</span>
                                    <span className="text-dark-100">{selectedApp.department}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">实习期间</span>
                                <span className="text-dark-100">
                                    {new Date(selectedApp.startDate).toLocaleDateString('zh-CN')} - {new Date(selectedApp.endDate).toLocaleDateString('zh-CN')}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">状态</span>
                                {getStatusBadge(selectedApp.status)}
                            </div>
                            {selectedApp.description && (
                                <div className="pt-2 border-t border-dark-700">
                                    <span className="text-dark-400 text-sm">实习内容描述</span>
                                    <p className="text-dark-200 text-sm mt-1 leading-relaxed">{selectedApp.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Company Review Form */}
                        {isCompany && ['SUBMITTED', 'COMPANY_REVIEWING'].includes(selectedApp.status) && (
                            <div className="border-t border-dark-700 pt-4 space-y-4">
                                <h3 className="font-semibold text-dark-100">企业评价</h3>
                                <div>
                                    <label className="input-label">评分 (1-100)</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={reviewData.score}
                                        onChange={(e) => setReviewData(r => ({ ...r, score: parseInt(e.target.value) }))}
                                        className="w-full"
                                    />
                                    <div className="text-center text-primary-400 font-bold">{reviewData.score} 分</div>
                                </div>
                                <div>
                                    <label className="input-label">评语 *</label>
                                    <textarea
                                        value={reviewData.evaluation}
                                        onChange={(e) => setReviewData(r => ({ ...r, evaluation: e.target.value }))}
                                        className="input-field w-full min-h-[100px]"
                                        placeholder="请填写对学生实习表现的评价..."
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleCompanyReview(false)}
                                        className="btn-secondary flex-1 text-red-400"
                                    >
                                        拒绝
                                    </button>
                                    <button
                                        onClick={() => handleCompanyReview(true)}
                                        className="btn-primary flex-1"
                                    >
                                        确认并签章
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* University Review Form */}
                        {isUniversity && ['COMPANY_APPROVED', 'UNIVERSITY_REVIEWING'].includes(selectedApp.status) && (
                            <div className="border-t border-dark-700 pt-4 space-y-4">
                                <h3 className="font-semibold text-dark-100">高校审核</h3>
                                {(selectedApp.companyScore || selectedApp.companyEvaluation) && (
                                    <div className="p-3 bg-dark-800 rounded-lg space-y-2">
                                        {selectedApp.companyScore && (
                                            <p className="text-sm text-dark-400">企业评分：<span className="text-primary-400 font-medium">{selectedApp.companyScore}分</span></p>
                                        )}
                                        {selectedApp.companyEvaluation && (
                                            <div>
                                                <p className="text-sm text-dark-400 mb-1">企业评语：</p>
                                                <p className="text-sm text-dark-200 leading-relaxed">{selectedApp.companyEvaluation}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label className="input-label">审批意见</label>
                                    <textarea
                                        value={approvalData.approval}
                                        onChange={(e) => setApprovalData(a => ({ ...a, approval: e.target.value }))}
                                        className="input-field w-full min-h-[80px]"
                                        placeholder="可选填写审批意见..."
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={approvalData.autoUpchain}
                                        onChange={(e) => setApprovalData(a => ({ ...a, autoUpchain: e.target.checked }))}
                                        className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500"
                                    />
                                    <label className="text-sm text-dark-300">审核通过后自动上链</label>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleUniversityReview(false)}
                                        className="btn-secondary flex-1 text-red-400"
                                    >
                                        拒绝
                                    </button>
                                    <button
                                        onClick={() => handleUniversityReview(true)}
                                        className="btn-primary flex-1"
                                    >
                                        批准并发起链上确认
                                    </button>
                                </div>
                                <p className="text-xs text-dark-500 mt-2">
                                    ℹ️ 批准后系统将自动创建证书并发起链上多方确认流程（高校签名 → 企业签名 → 上链完成）
                                </p>
                            </div>
                        )}

                        {/* Close button for view-only */}
                        {!((isCompany && ['SUBMITTED', 'COMPANY_REVIEWING'].includes(selectedApp.status)) ||
                            (isUniversity && ['COMPANY_APPROVED', 'UNIVERSITY_REVIEWING'].includes(selectedApp.status))) && (
                                <div className="border-t border-dark-700 pt-4">
                                    <button onClick={() => setShowDetailModal(false)} className="btn-secondary w-full">
                                        关闭
                                    </button>
                                </div>
                            )}
                    </motion.div>
                </div>
            )}

            {/* 删除确认框 */}
            <ConfirmDeleteModal
                isOpen={!!deletingApp}
                title="确认删除申请"
                message={`确定要删除申请 "${deletingApp?.applicationNo}"（岗位：${deletingApp?.position}）吗？${deletingApp?.certificate ? '\n⚠️ 该申请关联的证书也将被同步删除！' : ''}此操作不可撤销！`}
                onConfirm={confirmDeleteApp}
                onCancel={() => setDeletingApp(null)}
                isLoading={deleteLoading}
            />
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api, { University, Company } from '../services/api'
import { useAuthStore } from '../stores/authStore'

interface CertificateForm {
  studentProfileId: string
  universityId: string
  companyId: string
  position: string
  department: string
  startDate: string
  endDate: string
  description: string
  evaluation: string
  autoUpchain: boolean
}

interface StudentOption {
  id: string
  studentId: string
  user: { name: string; email: string }
}

export default function CreateCertificatePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [universities, setUniversities] = useState<University[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [studentSearch, setStudentSearch] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CertificateForm>({
    defaultValues: {
      universityId: user?.university?.id || '',
      companyId: user?.company?.id || '',
      autoUpchain: false,
    },
  })

  useEffect(() => {
    fetchUniversities()
    fetchCompanies()
  }, [])

  useEffect(() => {
    if (studentSearch.length >= 2) {
      searchStudents(studentSearch)
    }
  }, [studentSearch])

  const fetchUniversities = async () => {
    try {
      const response = await api.get('/universities?limit=100')
      setUniversities(response.data.data.universities)
    } catch (error) {
      console.error('Failed to fetch universities:', error)
    }
  }

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies?limit=100')
      setCompanies(response.data.data.companies)
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    }
  }

  const searchStudents = async (query: string) => {
    try {
      const response = await api.get(`/users/students/list?search=${query}`)
      setStudents(response.data.data)
    } catch (error) {
      console.error('Failed to search students:', error)
    }
  }

  const onSubmit = async (data: CertificateForm) => {
    setLoading(true)
    try {
      const response = await api.post('/certificates', data)
      toast.success('证明创建成功')
      navigate(`/certificates/${response.data.data.id}`)
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const selectedStudent = students.find((s) => s.id === watch('studentProfileId'))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">创建实习证明</h1>
          <p className="page-subtitle">填写实习信息并创建证明</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Student Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-primary-500/10">
              <DocumentTextIcon className="w-6 h-6 text-primary-400" />
            </div>
            <h2 className="card-title">学生信息</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="input-label">搜索学生</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="输入学号或姓名搜索..."
                  className="input-field pl-10"
                />
              </div>
              {students.length > 0 && studentSearch && (
                <div className="mt-2 bg-dark-800 rounded-xl border border-dark-700 max-h-48 overflow-y-auto">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        setValue('studentProfileId', student.id)
                        setStudentSearch('')
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-dark-700 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-dark-100 font-medium">{student.user.name}</p>
                        <p className="text-sm text-dark-400">{student.studentId}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent && (
              <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/30">
                <p className="text-sm text-primary-400 mb-1">已选择学生</p>
                <p className="text-dark-100 font-medium">{selectedStudent.user.name}</p>
                <p className="text-sm text-dark-400">学号：{selectedStudent.studentId}</p>
              </div>
            )}

            <input type="hidden" {...register('studentProfileId', { required: '请选择学生' })} />
            {errors.studentProfileId && (
              <p className="text-sm text-red-400">{errors.studentProfileId.message}</p>
            )}
          </div>
        </motion.div>

        {/* Institution Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="card-title mb-6">机构信息</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">发证高校</label>
              <select
                {...register('universityId', { required: '请选择高校' })}
                className="input-field"
                disabled={!!user?.university}
              >
                <option value="">请选择高校</option>
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name}
                  </option>
                ))}
              </select>
              {errors.universityId && (
                <p className="mt-1 text-sm text-red-400">{errors.universityId.message}</p>
              )}
            </div>

            <div>
              <label className="input-label">实习企业</label>
              <select
                {...register('companyId', { required: '请选择企业' })}
                className="input-field"
                disabled={!!user?.company}
              >
                <option value="">请选择企业</option>
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
              {errors.companyId && (
                <p className="mt-1 text-sm text-red-400">{errors.companyId.message}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Internship Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="card-title mb-6">实习信息</h2>
          
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">实习岗位 *</label>
                <input
                  type="text"
                  {...register('position', { required: '请输入实习岗位' })}
                  className="input-field"
                  placeholder="例如：软件开发实习生"
                />
                {errors.position && (
                  <p className="mt-1 text-sm text-red-400">{errors.position.message}</p>
                )}
              </div>

              <div>
                <label className="input-label">所属部门</label>
                <input
                  type="text"
                  {...register('department')}
                  className="input-field"
                  placeholder="例如：技术研发中心"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">开始日期 *</label>
                <input
                  type="date"
                  {...register('startDate', { required: '请选择开始日期' })}
                  className="input-field"
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-400">{errors.startDate.message}</p>
                )}
              </div>

              <div>
                <label className="input-label">结束日期 *</label>
                <input
                  type="date"
                  {...register('endDate', { required: '请选择结束日期' })}
                  className="input-field"
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-400">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="input-label">实习描述</label>
              <textarea
                {...register('description')}
                className="input-field h-24 resize-none"
                placeholder="描述实习内容和职责..."
              />
            </div>

            <div>
              <label className="input-label">实习评价</label>
              <textarea
                {...register('evaluation')}
                className="input-field h-24 resize-none"
                placeholder="对学生实习表现的评价..."
              />
            </div>
          </div>
        </motion.div>

        {/* Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="card-title mb-6">上链选项</h2>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('autoUpchain')}
              className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
            />
            <div>
              <p className="text-dark-100 font-medium">立即上链</p>
              <p className="text-sm text-dark-400">创建后自动将证明上链到区块链</p>
            </div>
          </label>
        </motion.div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                创建中...
              </span>
            ) : (
              '创建证明'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

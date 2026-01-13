import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: string
  studentId?: string
  applyOrgName?: string
  applyOrgCode?: string
  applyReason?: string
}

const roles = [
  { value: 'STUDENT', label: '学生', icon: '🎓', description: '在校学生，发起实习证明申请' },
  { value: 'UNIVERSITY', label: '高校管理员', icon: '🏛️', description: '高校管理员，审核实习证明' },
  { value: 'COMPANY', label: '企业用户', icon: '🏢', description: '企业HR，评价学生实习表现' },
  { value: 'THIRD_PARTY', label: '第三方机构', icon: '🔍', description: 'HR/用人单位，验证证明真实性' },
]

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [studentIdStatus, setStudentIdStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'used'>('idle')
  const [studentInfo, setStudentInfo] = useState<{ name: string; university?: { name: string } } | null>(null)
  const { register: registerUser, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: { role: 'STUDENT' },
  })

  const password = watch('password')
  const selectedRole = watch('role')
  const studentId = watch('studentId')

  // 检查学号是否在白名单中
  useEffect(() => {
    if (selectedRole !== 'STUDENT' || !studentId || studentId.length < 5) {
      setStudentIdStatus('idle')
      setStudentInfo(null)
      return
    }

    const checkStudentId = async () => {
      setStudentIdStatus('checking')
      try {
        const response = await api.get(`/whitelist/check/${studentId}`)
        if (response.data.success) {
          const data = response.data.data
          if (!data.exists) {
            setStudentIdStatus('invalid')
            setStudentInfo(null)
          } else if (data.isUsed) {
            setStudentIdStatus('used')
            setStudentInfo(null)
          } else {
            setStudentIdStatus('valid')
            setStudentInfo({ name: data.name, university: data.university })
            // 自动填充姓名
            if (data.name) {
              setValue('name', data.name)
            }
          }
        }
      } catch (error) {
        setStudentIdStatus('idle')
      }
    }

    const timer = setTimeout(checkStudentId, 500)
    return () => clearTimeout(timer)
  }, [studentId, selectedRole, setValue])

  const onSubmit = async (data: RegisterForm) => {
    try {
      // 学生必须有有效的学号
      if (data.role === 'STUDENT' && studentIdStatus !== 'valid') {
        toast.error('请输入有效的学号')
        return
      }

      const registerData: any = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      }

      // 学生需要学号
      if (data.role === 'STUDENT') {
        registerData.studentId = data.studentId
      }

      // 机构需要申请信息
      if (['UNIVERSITY', 'COMPANY', 'THIRD_PARTY'].includes(data.role)) {
        registerData.applyOrgName = data.applyOrgName
        registerData.applyOrgCode = data.applyOrgCode
        registerData.applyReason = data.applyReason
      }

      const result = await registerUser(registerData)

      // 检查是否需要等待审核
      if (result?.pendingApproval) {
        toast.success('注册申请已提交，请等待管理员审核')
        navigate('/login')
      } else {
        toast.success('注册成功')
        navigate('/dashboard')
      }
    } catch (error: any) {
      // Error handled by API interceptor
    }
  }

  const needsOrgInfo = ['UNIVERSITY', 'COMPANY', 'THIRD_PARTY'].includes(selectedRole)

  return (
    <div>
      {/* Mobile logo */}
      <div className="lg:hidden mb-6 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-display font-bold text-white">链证通</span>
        </div>
      </div>

      <div className="glass-card p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-display font-bold text-white mb-2">创建账户</h1>
          <p className="text-dark-400">加入区块链实习证明平台</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="input-label">账户类型</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <label
                  key={role.value}
                  className={`
                    relative flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all
                    ${watch('role') === role.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 bg-dark-800/50 hover:border-dark-500'
                    }
                  `}
                >
                  <input
                    type="radio"
                    value={role.value}
                    {...register('role')}
                    className="sr-only"
                  />
                  <span className="text-2xl mb-1">{role.icon}</span>
                  <span className={`text-xs font-medium ${watch('role') === role.value ? 'text-primary-400' : 'text-dark-300'
                    }`}>
                    {role.label}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-dark-400">
              {roles.find(r => r.value === selectedRole)?.description}
            </p>
          </div>

          {/* Student ID Field (for students only) */}
          {selectedRole === 'STUDENT' && (
            <div>
              <label className="input-label">学号 *</label>
              <div className="relative">
                <input
                  type="text"
                  {...register('studentId', {
                    required: selectedRole === 'STUDENT' ? '请输入学号' : false,
                    minLength: { value: 5, message: '学号至少5个字符' },
                  })}
                  className="input-field pr-10"
                  placeholder="请输入您的学号"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {studentIdStatus === 'checking' && (
                    <svg className="animate-spin w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {studentIdStatus === 'valid' && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                  {(studentIdStatus === 'invalid' || studentIdStatus === 'used') && <XCircleIcon className="w-5 h-5 text-red-400" />}
                </div>
              </div>
              {studentIdStatus === 'valid' && studentInfo && (
                <p className="mt-1 text-sm text-green-400">
                  ✓ 已验证：{studentInfo.name} {studentInfo.university?.name && `(${studentInfo.university.name})`}
                </p>
              )}
              {studentIdStatus === 'invalid' && (
                <p className="mt-1 text-sm text-red-400">学号不在系统白名单中，请联系管理员</p>
              )}
              {studentIdStatus === 'used' && (
                <p className="mt-1 text-sm text-red-400">该学号已被注册使用</p>
              )}
              {errors.studentId && (
                <p className="mt-1 text-sm text-red-400">{errors.studentId.message}</p>
              )}
            </div>
          )}

          {/* Organization Info (for non-students) */}
          {needsOrgInfo && (
            <>
              <div>
                <label className="input-label">机构名称 *</label>
                <input
                  type="text"
                  {...register('applyOrgName', {
                    required: needsOrgInfo ? '请输入机构名称' : false,
                  })}
                  className="input-field"
                  placeholder="请输入机构全称"
                />
                {errors.applyOrgName && (
                  <p className="mt-1 text-sm text-red-400">{errors.applyOrgName.message}</p>
                )}
              </div>

              <div>
                <label className="input-label">机构代码 *</label>
                <input
                  type="text"
                  {...register('applyOrgCode', {
                    required: needsOrgInfo ? '请输入机构代码' : false,
                  })}
                  className="input-field"
                  placeholder="统一社会信用代码/高校代码"
                />
                {errors.applyOrgCode && (
                  <p className="mt-1 text-sm text-red-400">{errors.applyOrgCode.message}</p>
                )}
              </div>

              <div>
                <label className="input-label">申请说明</label>
                <textarea
                  {...register('applyReason')}
                  className="input-field min-h-[80px]"
                  placeholder="请简要说明您的申请理由（可选）"
                />
              </div>
            </>
          )}

          <div>
            <label className="input-label">姓名</label>
            <input
              type="text"
              {...register('name', {
                required: '请输入姓名',
                minLength: { value: 2, message: '姓名至少2个字符' },
              })}
              className="input-field"
              placeholder="请输入您的姓名"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="input-label">邮箱地址</label>
            <input
              type="email"
              {...register('email', {
                required: '请输入邮箱',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '请输入有效的邮箱地址',
                },
              })}
              className="input-field"
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="input-label">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', {
                  required: '请输入密码',
                  minLength: { value: 6, message: '密码至少6个字符' },
                })}
                className="input-field pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="input-label">确认密码</label>
            <input
              type="password"
              {...register('confirmPassword', {
                required: '请确认密码',
                validate: (value) =>
                  value === password || '两次输入的密码不一致',
              })}
              className="input-field"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Notice for organizations */}
          {needsOrgInfo && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-400">
                📋 机构账户需要管理员审核，审核通过后方可登录使用。
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              required
              className="mt-1 w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
            />
            <span className="text-sm text-dark-400">
              我已阅读并同意{' '}
              <a href="#" className="text-primary-400 hover:text-primary-300">
                服务条款
              </a>{' '}
              和{' '}
              <a href="#" className="text-primary-400 hover:text-primary-300">
                隐私政策
              </a>
            </span>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading || (selectedRole === 'STUDENT' && studentIdStatus !== 'valid')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full btn-primary py-3.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                注册中...
              </span>
            ) : needsOrgInfo ? (
              '提交申请'
            ) : (
              '创建账户'
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-dark-400 text-sm">
            已有账户？{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

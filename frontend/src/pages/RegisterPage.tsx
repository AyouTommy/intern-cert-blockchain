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
  {
    value: 'STUDENT',
    label: '学生',
    icon: '🎓',
    description: '在校学生，发起实习申请并获取链上证明',
    color: 'from-blue-500/15 to-cyan-500/15 border-blue-500',
  },
  {
    value: 'UNIVERSITY',
    label: '高校管理员',
    icon: '🏛️',
    description: '高校教务人员，审核实习证明并上链签名',
    color: 'from-amber-500/15 to-orange-500/15 border-amber-500',
  },
  {
    value: 'COMPANY',
    label: '企业用户',
    icon: '🏢',
    description: '企业HR/导师，评价学生实习并参与链上确认',
    color: 'from-violet-500/15 to-purple-500/15 border-violet-500',
  },
  {
    value: 'THIRD_PARTY',
    label: '第三方机构',
    icon: '🔍',
    description: '用人单位/背调机构，批量核验证明真伪',
    color: 'from-emerald-500/15 to-teal-500/15 border-emerald-500',
  },
]

// 角色专属注册须知
const roleNotices: Record<string, { icon: string; title: string; items: string[]; color: string }> = {
  STUDENT: {
    icon: '📋',
    title: '学生注册须知',
    color: 'border-blue-500/30 bg-blue-500/5',
    items: [
      '您的学号必须已被高校加入系统白名单',
      '注册后可立即使用，无需管理员审核',
      '注册完成后可发起实习申请、查看证书和个人履历',
    ],
  },
  UNIVERSITY: {
    icon: '⏳',
    title: '高校管理员注册须知',
    color: 'border-amber-500/30 bg-amber-500/5',
    items: [
      '注册后需等待系统管理员审核通过方可使用',
      '审核通过后系统将自动分配独立的区块链签名密钥',
      '您将负责审核学生提交的实习证明并进行链上签名确认',
    ],
  },
  COMPANY: {
    icon: '⏳',
    title: '企业用户注册须知',
    color: 'border-violet-500/30 bg-violet-500/5',
    items: [
      '注册后需等待系统管理员审核通过方可使用',
      '审核通过后系统将自动分配独立的区块链签名密钥',
      '您可对实习生进行多维度评价并参与链上多方确认',
    ],
  },
  THIRD_PARTY: {
    icon: '⏳',
    title: '第三方机构注册须知',
    color: 'border-emerald-500/30 bg-emerald-500/5',
    items: [
      '注册后需等待系统管理员审核通过方可使用',
      '审核通过后可使用批量核验和报告生成功能',
      '支持通过证书编号或核验码验证证明真伪',
    ],
  },
}

// 角色专属字段配置
const orgFieldConfig: Record<string, { nameLabel: string; namePlaceholder: string; codeLabel: string; codePlaceholder: string; reasonPlaceholder: string }> = {
  UNIVERSITY: {
    nameLabel: '高校名称',
    namePlaceholder: '如：北京大学、清华大学',
    codeLabel: '高校代码',
    codePlaceholder: '教育部高校代码（如：10001）',
    reasonPlaceholder: '请简要说明您在高校中的职务（如：教务处实习管理科科长）',
  },
  COMPANY: {
    nameLabel: '企业名称',
    namePlaceholder: '如：腾讯科技有限公司',
    codeLabel: '统一社会信用代码',
    codePlaceholder: '18位统一社会信用代码',
    reasonPlaceholder: '请简要说明与哪些高校有实习合作关系',
  },
  THIRD_PARTY: {
    nameLabel: '机构名称',
    namePlaceholder: '如：前程无忧、猎聘网',
    codeLabel: '机构代码',
    codePlaceholder: '统一社会信用代码或机构编号',
    reasonPlaceholder: '请简要说明核验证明的用途（如：员工背景调查）',
  },
}

// 密码强度计算
function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 1, label: '弱', color: 'bg-red-500' }
  if (score <= 3) return { level: 2, label: '中', color: 'bg-amber-500' }
  return { level: 3, label: '强', color: 'bg-emerald-500' }
}

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

  const passwordStrength = getPasswordStrength(password || '')

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
  const currentOrgConfig = orgFieldConfig[selectedRole]
  const currentNotice = roleNotices[selectedRole]

  return (
    <div>
      {/* Mobile logo */}
      <div className="lg:hidden mb-6 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <svg className="w-7 h-7 text-dark-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-display font-bold text-dark-100">链证通</span>
        </div>
      </div>

      <div className="glass-card p-6 lg:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-display font-bold text-dark-100 mb-1">创建账户</h1>
          <p className="text-dark-400 text-sm">加入高校实习证明区块链上链平台</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* 第一部分：角色选择 */}
          <div>
            <label className="input-label mb-2 block">选择您的角色</label>
            <div className="space-y-2">
              {roles.map((role) => {
                const isSelected = watch('role') === role.value
                return (
                  <label
                    key={role.value}
                    className={`
                      relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                      ${isSelected
                        ? `bg-gradient-to-r ${role.color} border-opacity-60`
                        : 'border-dark-700 bg-dark-800/30 hover:border-dark-500 hover:bg-dark-800/60'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      value={role.value}
                      {...register('role')}
                      className="sr-only"
                    />
                    <span className="text-2xl flex-shrink-0">{role.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isSelected ? 'text-dark-100' : 'text-dark-300'}`}>
                        {role.label}
                      </p>
                      <p className={`text-xs ${isSelected ? 'text-dark-300' : 'text-dark-500'}`}>
                        {role.description}
                      </p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      isSelected ? 'border-primary-400' : 'border-dark-600'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary-400" />}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* 角色注册须知 */}
          {currentNotice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`p-3 rounded-lg border ${currentNotice.color}`}
            >
              <p className="text-sm font-medium text-dark-200 mb-1.5">
                {currentNotice.icon} {currentNotice.title}
              </p>
              <ul className="space-y-1">
                {currentNotice.items.map((item, i) => (
                  <li key={i} className="text-xs text-dark-400 flex items-start gap-1.5">
                    <span className="text-dark-600 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* 第二部分：角色专属字段 */}

          {/* 学生 — 学号 */}
          {selectedRole === 'STUDENT' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <label className="input-label">学号 *</label>
              <div className="relative">
                <input
                  type="text"
                  {...register('studentId', {
                    required: selectedRole === 'STUDENT' ? '请输入学号' : false,
                    minLength: { value: 5, message: '学号至少5个字符' },
                  })}
                  className="input-field pr-10"
                  placeholder="请输入您的学号（需在白名单中）"
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
                <p className="mt-1 text-sm text-red-400">学号不在系统白名单中，请联系高校管理员添加</p>
              )}
              {studentIdStatus === 'used' && (
                <p className="mt-1 text-sm text-red-400">该学号已被注册使用</p>
              )}
              {errors.studentId && (
                <p className="mt-1 text-sm text-red-400">{errors.studentId.message}</p>
              )}
            </motion.div>
          )}

          {/* 机构 — 专属字段 */}
          {needsOrgInfo && currentOrgConfig && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <label className="input-label">{currentOrgConfig.nameLabel} *</label>
                <input
                  type="text"
                  {...register('applyOrgName', {
                    required: needsOrgInfo ? `请输入${currentOrgConfig.nameLabel}` : false,
                  })}
                  className="input-field"
                  placeholder={currentOrgConfig.namePlaceholder}
                />
                {errors.applyOrgName && (
                  <p className="mt-1 text-sm text-red-400">{errors.applyOrgName.message}</p>
                )}
              </div>

              <div>
                <label className="input-label">{currentOrgConfig.codeLabel} *</label>
                <input
                  type="text"
                  {...register('applyOrgCode', {
                    required: needsOrgInfo ? `请输入${currentOrgConfig.codeLabel}` : false,
                  })}
                  className="input-field"
                  placeholder={currentOrgConfig.codePlaceholder}
                />
                {errors.applyOrgCode && (
                  <p className="mt-1 text-sm text-red-400">{errors.applyOrgCode.message}</p>
                )}
              </div>

              <div>
                <label className="input-label">申请说明</label>
                <textarea
                  {...register('applyReason')}
                  className="input-field min-h-[72px] resize-none"
                  placeholder={currentOrgConfig.reasonPlaceholder}
                />
              </div>
            </motion.div>
          )}

          {/* 第三部分：基本信息 */}
          <div className="pt-1 border-t border-dark-800/50">
            <p className="text-xs text-dark-500 mb-3 mt-3">基本信息</p>
          </div>

          <div>
            <label className="input-label">姓名 *</label>
            <input
              type="text"
              {...register('name', {
                required: '请输入姓名',
                minLength: { value: 2, message: '姓名至少2个字符' },
              })}
              className="input-field"
              placeholder="请输入您的真实姓名"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="input-label">邮箱地址 *</label>
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
            <label className="input-label">密码 *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', {
                  required: '请输入密码',
                  minLength: { value: 6, message: '密码至少6个字符' },
                })}
                className="input-field pr-10"
                placeholder="至少6个字符"
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
            {/* 密码强度条 */}
            {password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden flex gap-0.5">
                  {[1, 2, 3].map(level => (
                    <div
                      key={level}
                      className={`flex-1 rounded-full transition-colors ${
                        passwordStrength.level >= level ? passwordStrength.color : 'bg-dark-700'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${
                  passwordStrength.level === 1 ? 'text-red-400' :
                  passwordStrength.level === 2 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="input-label">确认密码 *</label>
            <input
              type="password"
              {...register('confirmPassword', {
                required: '请确认密码',
                validate: (value) =>
                  value === password || '两次输入的密码不一致',
              })}
              className="input-field"
              placeholder="再次输入密码"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* 服务条款 */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              required
              className="mt-1 w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
            />
            <span className="text-sm text-dark-400">
              我已阅读并同意{' '}
              <Link to="/terms" className="text-primary-400 hover:text-primary-300">
                服务条款
              </Link>{' '}
              和{' '}
              <Link to="/privacy" className="text-primary-400 hover:text-primary-300">
                隐私政策
              </Link>
            </span>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading || (selectedRole === 'STUDENT' && studentIdStatus !== 'valid')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full btn-primary py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                处理中...
              </span>
            ) : needsOrgInfo ? (
              '提交注册申请'
            ) : (
              '创建账户'
            )}
          </motion.button>
        </form>

        <div className="mt-5 text-center">
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

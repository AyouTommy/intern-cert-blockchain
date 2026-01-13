import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'

interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: string
}

const roles = [
  { value: 'STUDENT', label: '学生', icon: '🎓' },
  { value: 'UNIVERSITY', label: '高校管理员', icon: '🏛️' },
  { value: 'COMPANY', label: '企业用户', icon: '🏢' },
]

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { register: registerUser, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: { role: 'STUDENT' },
  })

  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      })
      toast.success('注册成功')
      navigate('/dashboard')
    } catch (error: any) {
      // Error handled by API interceptor
    }
  }

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
            <div className="grid grid-cols-3 gap-2">
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
                  <span className={`text-xs font-medium ${
                    watch('role') === role.value ? 'text-primary-400' : 'text-dark-300'
                  }`}>
                    {role.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

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
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full btn-primary py-3.5 mt-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                注册中...
              </span>
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

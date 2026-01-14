import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api from '../services/api'

interface ForgotPasswordForm {
    email: string
    newPassword: string
    confirmPassword: string
    reason?: string
}

export default function ForgotPasswordPage() {
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ForgotPasswordForm>()

    const password = watch('newPassword')

    const onSubmit = async (data: ForgotPasswordForm) => {
        setIsLoading(true)
        try {
            await api.post('/auth/forgot-password', {
                email: data.email,
                newPassword: data.newPassword,
                reason: data.reason,
            })
            setSubmitted(true)
            toast.success('密码重置申请已提交')
        } catch (error: any) {
            toast.error(error.response?.data?.message || '提交失败')
        } finally {
            setIsLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="glass-card p-8 text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-500/20 flex items-center justify-center"
                >
                    <EnvelopeIcon className="w-10 h-10 text-primary-400" />
                </motion.div>
                <h1 className="text-2xl font-bold text-dark-100 mb-4">申请已提交</h1>
                <p className="text-dark-400 mb-6">
                    您的密码重置申请已提交给管理员审核。<br />
                    审核通过后，您的新密码将立即生效。
                </p>
                <Link to="/login" className="btn-primary inline-block">
                    返回登录
                </Link>
            </div>
        )
    }

    return (
        <div>
            {/* Mobile logo */}
            <div className="lg:hidden mb-8 text-center">
                <div className="inline-flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                        <KeyIcon className="w-7 h-7 text-dark-100" />
                    </div>
                    <span className="text-xl font-display font-bold text-dark-100">链证通</span>
                </div>
                <h2 className="text-2xl font-bold text-dark-100">找回密码</h2>
            </div>

            <div className="glass-card p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-display font-bold text-dark-100 mb-2">忘记密码</h1>
                    <p className="text-dark-400">填写以下信息申请重置密码</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div>
                        <label className="input-label">注册邮箱</label>
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
                        <label className="input-label">新密码</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                {...register('newPassword', {
                                    required: '请输入新密码',
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
                        {errors.newPassword && (
                            <p className="mt-1 text-sm text-red-400">{errors.newPassword.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="input-label">确认新密码</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            {...register('confirmPassword', {
                                required: '请确认新密码',
                                validate: value => value === password || '两次密码不一致',
                            })}
                            className="input-field"
                            placeholder="••••••••"
                        />
                        {errors.confirmPassword && (
                            <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="input-label">申请原因（可选）</label>
                        <textarea
                            {...register('reason')}
                            className="input-field min-h-[80px]"
                            placeholder="请简要说明申请重置密码的原因"
                        />
                    </div>

                    <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full btn-primary py-3.5"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                提交中...
                            </span>
                        ) : (
                            '提交申请'
                        )}
                    </motion.button>
                </form>

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-dark-400 text-sm hover:text-dark-200">
                        ← 返回登录
                    </Link>
                </div>
            </div>
        </div>
    )
}

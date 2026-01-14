import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HomeIcon } from '@heroicons/react/24/outline'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 bg-accent-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 404 Number */}
          <motion.h1
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="text-[180px] font-display font-bold leading-none gradient-text"
          >
            404
          </motion.h1>

          <h2 className="text-3xl font-display font-bold text-dark-100 mb-4">
            页面未找到
          </h2>
          
          <p className="text-dark-400 mb-8 max-w-md mx-auto">
            抱歉，您访问的页面不存在或已被移除。
            请检查URL是否正确，或返回首页。
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              to="/"
              className="btn-primary inline-flex items-center gap-2"
            >
              <HomeIcon className="w-5 h-5" />
              返回首页
            </Link>
            <button
              onClick={() => window.history.back()}
              className="btn-secondary"
            >
              返回上一页
            </button>
          </div>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="w-[500px] h-[500px] border border-dark-800 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            className="absolute top-10 left-10 right-10 bottom-10 border border-dark-800/50 rounded-full"
          />
        </div>
      </div>
    </div>
  )
}

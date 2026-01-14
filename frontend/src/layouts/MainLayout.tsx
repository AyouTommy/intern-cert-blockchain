import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  UsersIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/authStore'
import NotificationBell from '../components/NotificationBell'
import clsx from 'clsx'

const navigation = [
  { name: '控制台', href: '/dashboard', icon: HomeIcon, roles: ['ADMIN', 'UNIVERSITY', 'COMPANY', 'STUDENT', 'THIRD_PARTY'] },
  { name: '我的申请', href: '/applications', icon: ClipboardDocumentListIcon, roles: ['STUDENT'] },
  { name: '申请评价', href: '/applications', icon: ClipboardDocumentListIcon, roles: ['COMPANY'] },
  { name: '申请审核', href: '/applications', icon: ClipboardDocumentListIcon, roles: ['UNIVERSITY', 'ADMIN'] },
  { name: '实习证明', href: '/certificates', icon: DocumentTextIcon, roles: ['ADMIN', 'UNIVERSITY', 'COMPANY', 'STUDENT'] },
  { name: '证明核验', href: '/verify', icon: ShieldCheckIcon, roles: ['ADMIN', 'UNIVERSITY', 'COMPANY', 'STUDENT', 'THIRD_PARTY'] },
  { name: '高校管理', href: '/universities', icon: BuildingOfficeIcon, roles: ['ADMIN'] },
  { name: '企业管理', href: '/companies', icon: BuildingOffice2Icon, roles: ['ADMIN'] },
  { name: '第三方机构', href: '/third-party-orgs', icon: BuildingOffice2Icon, roles: ['ADMIN'] },
  { name: '学生白名单', href: '/whitelist', icon: UserGroupIcon, roles: ['ADMIN'] },
  { name: '用户管理', href: '/users', icon: UsersIcon, roles: ['ADMIN'] },
  { name: '系统设置', href: '/settings', icon: Cog6ToothIcon, roles: ['ADMIN', 'UNIVERSITY', 'COMPANY'] },
]

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const filteredNavigation = navigation.filter(
    (item) => item.roles.includes(user?.role || '')
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: '系统管理员',
      UNIVERSITY: '高校管理员',
      COMPANY: '企业用户',
      STUDENT: '学生',
      THIRD_PARTY: '第三方机构',
    }
    return labels[role] || role
  }

  const getRoleBadgeClass = (role: string) => {
    const classes: Record<string, string> = {
      ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
      UNIVERSITY: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      COMPANY: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      STUDENT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      THIRD_PARTY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    }
    return classes[role] || 'bg-dark-700 text-dark-300'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-dark-900/30 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white border-r border-dark-200 z-50 lg:hidden"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-dark-200">
                <Logo />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-dark-400 hover:text-dark-900 rounded-lg hover:bg-dark-100"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <Navigation items={filteredNavigation} onItemClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:flex lg:flex-col bg-white border-r border-dark-200">
        <div className="flex items-center h-16 px-6 border-b border-dark-200">
          <Logo />
        </div>
        <Navigation items={filteredNavigation} />

        {/* Quick Actions */}
        {(user?.role === 'ADMIN' || user?.role === 'UNIVERSITY' || user?.role === 'COMPANY') && (
          <div className="px-4 py-4 border-t border-dark-200">
            <button
              onClick={() => navigate('/certificates/new')}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              创建新证明
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-dark-200">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-dark-400 hover:text-dark-100 rounded-lg hover:bg-dark-800 lg:hidden"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            {/* Spacer for balance */}
            <div className="hidden md:block flex-1" />

            {/* Notification Bell */}
            <NotificationBell />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-dark-800 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-medium">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-dark-100">{user?.name}</p>
                  <p className="text-xs text-dark-400">{user?.university?.name || user?.company?.name || getRoleLabel(user?.role || '')}</p>
                </div>
                <ChevronDownIcon className={clsx(
                  'w-4 h-4 text-dark-400 transition-transform',
                  userMenuOpen && 'rotate-180'
                )} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="dropdown"
                    >
                      <div className="px-4 py-3 border-b border-dark-700">
                        <p className="text-sm font-medium text-dark-100">{user?.name}</p>
                        <p className="text-xs text-dark-400 truncate">{user?.email}</p>
                        <span className={clsx('inline-block mt-2 px-2 py-0.5 text-xs rounded-full border', getRoleBadgeClass(user?.role || ''))}>
                          {getRoleLabel(user?.role || '')}
                        </span>
                      </div>
                      <div className="py-2">
                        <button
                          onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}
                          className="dropdown-item w-full text-left"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                          账户设置
                        </button>
                        <button
                          onClick={handleLogout}
                          className="dropdown-item w-full text-left text-red-400 hover:text-red-300"
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4" />
                          退出登录
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div>
        <h1 className="text-lg font-display font-bold text-dark-50">链证通</h1>
        <p className="text-xs text-dark-500">实习证明上链系统</p>
      </div>
    </div>
  )
}

interface NavigationProps {
  items: typeof navigation
  onItemClick?: () => void
}

function Navigation({ items, onItemClick }: NavigationProps) {
  return (
    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
      {items.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          onClick={onItemClick}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
              isActive
                ? 'bg-primary-500/10 text-primary-400'
                : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800/50'
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={clsx('w-5 h-5', isActive && 'text-primary-400')} />
              <span className="font-medium">{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400"
                />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

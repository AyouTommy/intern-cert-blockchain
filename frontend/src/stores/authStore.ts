// ==========================================
//! 【前端状态管理】用户登录状态存储
// 用 Zustand 管理登录状态，配合 sessionStorage 持久化
// 用 sessionStorage 而不是 localStorage 的原因:
//   每个浏览器标签页独立，可以同时登录不同角色演示
// ==========================================
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '../services/api'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'UNIVERSITY' | 'COMPANY' | 'STUDENT' | 'THIRD_PARTY'
  avatar?: string
  phone?: string
  walletAddress?: string
  university?: {
    id: string
    code: string
    name: string
    logo?: string
  }
  company?: {
    id: string
    code: string
    name: string
    logo?: string
  }
  studentProfile?: {
    studentId: string
    grade?: string
    major?: string
    department?: string
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<RegisterResult>
  logout: () => void
  fetchUser: () => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  name: string
  role: string
  studentId?: string
  universityId?: string
  companyId?: string
  applyOrgName?: string
  applyOrgCode?: string
  applyReason?: string
}

interface RegisterResult {
  pendingApproval?: boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { user, token } = response.data.data

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })

          //! 【关键】登录成功后，把令牌设置到请求头里
          // 之后所有请求都会自动带上这个令牌，后端的认证中间件会验证它
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (data: RegisterData): Promise<RegisterResult> => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/register', data)
          const responseData = response.data.data

          // 检查是否需要等待审核（高校/企业/第三方机构）
          if (responseData.pendingApproval) {
            set({ isLoading: false })
            return { pendingApproval: true }
          }

          const { user, token } = responseData

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })

          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          return { pendingApproval: false }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
        delete api.defaults.headers.common['Authorization']
      },

      fetchUser: async () => {
        const { token } = get()
        if (!token) return

        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const response = await api.get('/auth/me')
          set({ user: response.data.data, isAuthenticated: true })
        } catch {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          })
        }
      },

      updateUser: async (data: Partial<User>) => {
        const response = await api.put('/auth/me', data)
        set({ user: response.data.data })
      },
    }),
    {
      name: 'auth-storage',
      //! 【部署关键】使用 sessionStorage 存储令牌
      // 而不是 localStorage，这样每个标签页独立，可以同时开多个标签页登录不同角色
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ token: state.token }) as AuthState,
    }
  )
)

// Initialize auth on app load
const token = useAuthStore.getState().token
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  useAuthStore.getState().fetchUser()
}

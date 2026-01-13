import axios from 'axios'
import toast from 'react-hot-toast'

// 动态获取API地址
const getApiBaseUrl = () => {
  // 生产环境使用环境变量配置的后端地址
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // 本地开发使用代理
  return '/api'
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败'
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
      toast.error('登录已过期，请重新登录')
    } else if (error.response?.status === 403) {
      toast.error('权限不足')
    } else if (error.response?.status === 404) {
      toast.error('资源不存在')
    } else if (error.response?.status >= 500) {
      toast.error('服务器错误，请稍后重试')
    } else {
      toast.error(message)
    }
    
    return Promise.reject(error)
  }
)

export default api

// API Types
export interface PaginatedResponse<T> {
  success: boolean
  data: {
    items: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

export interface Certificate {
  id: string
  certNumber: string
  status: 'PENDING' | 'PROCESSING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'FAILED'
  position: string
  department?: string
  startDate: string
  endDate: string
  description?: string
  evaluation?: string
  certHash?: string
  txHash?: string
  blockNumber?: number
  chainId?: number
  verifyCode: string
  verifyUrl?: string
  qrCode?: string
  issuedAt?: string
  revokedAt?: string
  createdAt: string
  student: {
    id: string
    studentId: string
    user: {
      name: string
      email?: string
    }
  }
  university: {
    id: string
    code: string
    name: string
    logo?: string
  }
  company: {
    id: string
    code: string
    name: string
    logo?: string
  }
  issuer?: {
    id: string
    name: string
  }
}

export interface University {
  id: string
  code: string
  name: string
  englishName?: string
  province?: string
  city?: string
  address?: string
  logo?: string
  website?: string
  isVerified: boolean
  _count?: {
    certificates: number
  }
}

export interface Company {
  id: string
  code: string
  name: string
  englishName?: string
  industry?: string
  scale?: string
  province?: string
  city?: string
  logo?: string
  website?: string
  isVerified: boolean
  _count?: {
    certificates: number
  }
}

export interface DashboardStats {
  overview: {
    totalCertificates: number
    activeCertificates: number
    pendingCertificates: number
    revokedCertificates: number
    totalUniversities: number
    totalCompanies: number
    totalStudents: number
    recentVerifications: number
  }
  trend: {
    date: string
    created: number
    active: number
  }[]
  blockchain?: {
    total: number
    active: number
    revoked: number
  }
}

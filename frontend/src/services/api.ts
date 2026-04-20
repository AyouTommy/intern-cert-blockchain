import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'

// ==========================================
//! 【前端核心】请求封装 — 所有前端请求都经过这个文件
// 做2件事:
//   ① 自动读取后端地址（部署时从环境变量读取）
//   ② 自动给每个请求带上登录令牌
// ==========================================

// 动态获取后端地址
const getApiBaseUrl = () => {
  //! 【部署关键】生产环境从环境变量读取后端地址
  // 在Vercel后台配置: VITE_API_URL = 后端 Render 地址
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // 本地开发使用代理
  return '/api'
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
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
  (response) => response,
  async (error: AxiosError) => {
    const message = error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data
      ? (error.response.data as { message: string }).message
      : error.message || '请求失败'

    if (error.response?.status === 401) {
      // 检查是否在登录页面 - 如果是，显示后端返回的错误消息（如密码错误）
      const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/register'
      if (isLoginPage) {
        // 登录/注册页面的401错误，显示后端返回的具体错误信息
        toast.error(message)
      } else {
        // Token expired or invalid - 非登录页面的401错误，说明token过期
        sessionStorage.removeItem('auth-storage')
        window.location.href = '/login'
        toast.error('登录已过期，请重新登录')
      }
    } else if (error.response?.status === 403) {
      toast.error(message || '权限不足')
    } else if (error.response?.status === 404) {
      toast.error(message || '资源不存在')
    } else if (error.response?.status && error.response.status >= 500) {
      toast.error('服务器错误，请稍后重试')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('请求超时，请检查网络后重试')
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
  ipfsHash?: string
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
  attachments?: {
    id: string
    fileName: string
    originalName: string
    fileSize: number
    mimeType: string
    category: string
    description?: string
  }[]
  verifications?: {
    id: string
    createdAt: string
    verifierIp?: string
    isValid: boolean
  }[]
  evaluatedAt?: string  // 企业评价时间
  approvedAt?: string   // 高校审核时间
  revokeReason?: string
  // 多方确认信息
  universityAddr?: string  // 高校链上确认地址
  companyAddr?: string     // 企业链上确认地址
  contentHash?: string     // 内容完整性哈希
  // 上链重试信息
  retryCount?: number
  lastRetryAt?: string
  failReason?: string
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
    contractAddress: string
    network: {
      chainId: number
      name: string
      blockNumber: number
    }
    wallets: {
      admin: string
      university: string
      company: string
    }
    deployGasUsed: number
  }
}

// Settings 区块链 Tab 用
export interface BlockchainInfo {
  connected: boolean
  network: {
    name: string
    chainId: number
    blockNumber: number
  }
  contract: {
    address: string | null
    deployed: boolean
  }
  wallets: {
    admin: string
    university: string
    company: string
  }
  features: {
    multiPartyConfirmation: boolean
    autoRetry: { enabled: boolean; maxRetries: number }
  }
  gas: {
    deployGasUsed: number
    estimatePerCert: number
    estimateVerify: number
  }
  stats?: {
    total: number
    active: number
    revoked: number
  }
}

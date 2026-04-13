import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'

/**
 * #4 WebSocket 实时通知 Hook
 * 连接后端 Socket.IO，接收链上事件推送
 * 使用方式: 在 App.tsx 或 MainLayout 中调用 useBlockchainSocket()
 */
export function useBlockchainSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('🔗 WebSocket 已连接:', socket.id)
    })

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket 已断开')
    })

    // 链上事件 → 前端通知
    socket.on('certificate:created', (data: any) => {
      toast.success(`📜 证书已上链: ${data.certHash?.slice(0, 10)}...`, { duration: 5000 })
    })

    socket.on('certificate:finalized', () => {
      toast.success('✅ 证书多方确认已完成！', { duration: 5000 })
    })

    socket.on('certificate:revoked', () => {
      toast('⚠️ 证书已被撤销', { icon: '🚫', duration: 5000 })
    })

    socket.on('certificate:confirmed', (data: any) => {
      toast(`🔏 收到 ${data.role} 确认`, { duration: 4000 })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return socketRef
}

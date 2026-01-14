import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import api from '../services/api'

interface Notification {
    id: string
    title: string
    content: string
    type: string
    isRead: boolean
    createdAt: string
}

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchUnreadCount()
        // 每30秒刷新未读数量
        const interval = setInterval(fetchUnreadCount, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        // 点击外部关闭下拉
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchUnreadCount = async () => {
        try {
            const response = await api.get('/notifications/unread-count')
            setUnreadCount(response.data.data.count)
        } catch (error) {
            console.error('Failed to fetch unread count')
        }
    }

    const fetchNotifications = async () => {
        setLoading(true)
        try {
            const response = await api.get('/notifications?limit=10')
            setNotifications(response.data.data.notifications)
        } catch (error) {
            console.error('Failed to fetch notifications')
        } finally {
            setLoading(false)
        }
    }

    const handleOpen = () => {
        if (!isOpen) {
            fetchNotifications()
        }
        setIsOpen(!isOpen)
    }

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`)
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ))
            setUnreadCount(Math.max(0, unreadCount - 1))
        } catch (error) {
            console.error('Failed to mark as read')
        }
    }

    const markAllAsRead = async () => {
        try {
            const response = await api.patch('/notifications/read-all')
            if (response.data.success) {
                setNotifications(notifications.map(n => ({ ...n, isRead: true })))
                setUnreadCount(0)
            }
        } catch (error: any) {
            console.error('Failed to mark all as read:', error)
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'APPROVAL_REQUEST':
                return '📋'
            case 'APPLICATION_STATUS':
                return '📄'
            case 'PASSWORD_RESET':
                return '🔑'
            case 'SYSTEM':
                return '🔔'
            default:
                return '📌'
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleOpen}
                className="relative p-2 text-dark-400 hover:text-dark-200 transition-colors"
            >
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-dark-100 text-xs font-bold rounded-full flex items-center justify-center"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto glass-card shadow-xl z-50"
                    >
                        <div className="p-3 border-b border-dark-700 flex items-center justify-between">
                            <h3 className="font-semibold text-dark-100">通知</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                                >
                                    <CheckIcon className="w-3 h-3" />
                                    全部已读
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-dark-400">加载中...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-dark-400">暂无通知</div>
                        ) : (
                            <div>
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                                        className={`p-3 border-b border-dark-700/50 hover:bg-dark-800/50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-primary-500/5' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <span className="text-lg">{getTypeIcon(notification.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-medium text-sm truncate ${notification.isRead ? 'text-dark-300' : 'text-dark-100'
                                                        }`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.isRead && (
                                                        <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-dark-400 mt-0.5 line-clamp-2">
                                                    {notification.content}
                                                </p>
                                                <p className="text-xs text-dark-500 mt-1">
                                                    {format(new Date(notification.createdAt), 'MM/dd HH:mm')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

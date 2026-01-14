import { motion } from 'framer-motion'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ConfirmDeleteModalProps {
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
    isLoading?: boolean
}

export default function ConfirmDeleteModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    isLoading = false,
}: ConfirmDeleteModalProps) {
    if (!isOpen) return null

    return (
        <div className="modal-overlay flex items-center justify-center z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="modal-content max-w-md"
            >
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-dark-100 mb-2">{title}</h3>
                        <p className="text-dark-400">{message}</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn-secondary"
                        disabled={isLoading}
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-dark-100 rounded-lg transition-colors disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? '删除中...' : '确认删除'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

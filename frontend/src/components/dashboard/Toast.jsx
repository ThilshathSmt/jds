import { useEffect } from 'react'
import { FaCircleCheck, FaCircleExclamation, FaXmark } from 'react-icons/fa6'

const variants = {
  success: { icon: FaCircleCheck, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  error: { icon: FaCircleExclamation, className: 'border-brand/30 bg-brand-soft text-brand-dark' },
}

const AUTO_CLOSE_MS = 5000

// Short notification in the corner of the screen that closes itself.
// `toast` is { message, variant: 'success' | 'error' } or null.
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(onClose, AUTO_CLOSE_MS)
    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null
  const { icon: Icon, className } = variants[toast.variant] ?? variants.success

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={`fixed right-4 bottom-4 left-4 z-50 flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg sm:left-auto sm:max-w-md ${className}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 shrink-0 text-lg" />
      <p className="flex-1 text-sm font-medium break-words">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="cursor-pointer rounded p-0.5 opacity-70 transition hover:opacity-100"
      >
        <FaXmark aria-hidden="true" />
      </button>
    </div>
  )
}

export default Toast

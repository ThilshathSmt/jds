import { useEffect, useRef } from 'react'
import { FaXmark } from 'react-icons/fa6'

// Modal panel built on the native <dialog> (focus is trapped, Esc closes), like
// ConfirmDialog. Render it only while it is open. `busy` blocks closing during a request.
function Modal({ title, icon: Icon, busy = false, onClose, children, className = '' }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl p-0 text-left whitespace-normal shadow-2xl backdrop:bg-black/50 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-deep via-brand-dark to-brand px-6 py-4 text-white">
        <h2 id="modal-title" className="flex items-center gap-3 text-lg font-bold sm:text-xl">
          {Icon && <Icon aria-hidden="true" />}
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="cursor-pointer rounded-full p-2 text-lg transition hover:bg-white/15 disabled:opacity-50"
        >
          <FaXmark aria-hidden="true" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  )
}

export default Modal

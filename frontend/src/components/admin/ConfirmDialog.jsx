import { useEffect, useRef } from 'react'

const confirmStyles = {
  primary: 'btn-primary',
  neutral: 'bg-ink text-white hover:bg-black',
}

// Modal confirmation built on the native <dialog>: focus is trapped and Esc cancels.
// Render it only while a confirmation is needed.
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = 'primary',
  busy = false,
  error,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-6 text-left whitespace-normal shadow-2xl backdrop:bg-black/50"
    >
      <h2 id="confirm-dialog-title" className="text-xl font-bold text-ink">
        {title}
      </h2>
      <p className="mt-3 text-gray-700">{message}</p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="btn !rounded-lg bg-gray-200 !px-5 !py-2 text-ink hover:bg-gray-300 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`btn !rounded-lg !px-5 !py-2 disabled:cursor-wait disabled:opacity-70 ${confirmStyles[tone]}`}
        >
          {busy ? 'Please wait...' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

export default ConfirmDialog

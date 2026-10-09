import { useState } from 'react'
import { FaBan, FaCircleCheck, FaTrashCan } from 'react-icons/fa6'
import ConfirmDialog from './ConfirmDialog'
import {
  approveApplication,
  deleteApplication,
  suspendApplication,
} from '../../services/applicationApi'

// Which actions each status offers. The backend enforces the same rules.
const ACTIONS_BY_STATUS = {
  NEW: ['approve', 'suspend', 'delete'],
  APPROVED: [],
  SUSPENDED: ['delete'],
}

const actions = {
  approve: {
    label: 'Approve',
    icon: FaCircleCheck,
    className: 'bg-emerald-600 text-white hover:bg-emerald-700',
    title: 'Approve application?',
    message: (name) =>
      `${name}'s application will be approved and a Driving School ID will be issued. This cannot be undone.`,
    confirmLabel: 'Approve',
    tone: 'primary',
    // Resolves with the updated application
    run: approveApplication,
  },
  suspend: {
    label: 'Suspend',
    icon: FaBan,
    className: 'bg-amber-500 text-white hover:bg-amber-600',
    title: 'Suspend application?',
    message: (name) =>
      `${name}'s application will be suspended and will not receive a Driving School ID.`,
    confirmLabel: 'Suspend',
    tone: 'neutral',
    run: suspendApplication,
  },
  delete: {
    label: 'Delete',
    icon: FaTrashCan,
    className: 'bg-brand text-white hover:bg-brand-dark',
    title: 'Delete application?',
    message: () =>
      'Are you sure you want to delete this registration application? Its uploaded documents will be removed too.',
    confirmLabel: 'Delete',
    tone: 'primary',
    // Resolves with null: the application no longer exists
    run: async (id) => {
      await deleteApplication(id)
      return null
    },
  },
}

// Approve / Suspend / Delete buttons for one application, each behind a confirmation.
// `onChanged(updatedApplication | null)` is called after a successful action (null = deleted).
function ApplicationActions({ application, onChanged, size = 'md' }) {
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const available = ACTIONS_BY_STATUS[application.status] ?? []
  if (available.length === 0) return null

  const sizeClass = size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-4 py-2 text-sm'
  const close = () => {
    setPending(null)
    setError('')
  }

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await actions[pending].run(application.id)
      setPending(null)
      onChanged(result)
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {available.map((key) => {
        const { label, icon: Icon, className } = actions[key]
        return (
          <button
            key={key}
            type="button"
            onClick={() => setPending(key)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg font-semibold transition ${sizeClass} ${className}`}
          >
            <Icon aria-hidden="true" />
            {label}
          </button>
        )
      })}

      {pending && (
        <ConfirmDialog
          title={actions[pending].title}
          message={actions[pending].message(application.fullName)}
          confirmLabel={actions[pending].confirmLabel}
          tone={actions[pending].tone}
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={close}
        />
      )}
    </>
  )
}

export default ApplicationActions

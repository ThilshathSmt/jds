import { useState } from 'react'
import { FaBan, FaCircleCheck, FaEye, FaTrashCan } from 'react-icons/fa6'
import ConfirmDialog from './ConfirmDialog'
import { activateUser, deactivateUser, deleteUser } from '../../services/userApi'

const actions = {
  activate: {
    label: 'Activate',
    icon: FaCircleCheck,
    className: 'bg-emerald-600 text-white hover:bg-emerald-700',
    title: 'Activate account?',
    message: (user) => `${user.name} (${user.drivingSchoolId}) will be able to log in again.`,
    confirmLabel: 'Activate',
    tone: 'neutral',
    run: activateUser,
    success: (user) => `${user.name}'s account has been activated.`,
  },
  deactivate: {
    label: 'Deactivate',
    icon: FaBan,
    className: 'bg-amber-500 text-white hover:bg-amber-600',
    title: 'Deactivate account?',
    message: (user) =>
      `${user.name} (${user.drivingSchoolId}) will be signed out everywhere and will not be able to log in until the account is activated again.`,
    confirmLabel: 'Deactivate',
    tone: 'neutral',
    run: deactivateUser,
    success: (user) => `${user.name}'s account has been deactivated.`,
  },
  delete: {
    label: 'Delete',
    icon: FaTrashCan,
    className: 'bg-brand text-white hover:bg-brand-dark',
    title: 'Permanently delete account?',
    message: (user) =>
      `This permanently deletes ${user.name}'s login account and cannot be undone. ` +
      `They will be signed out and can never log in with ${user.drivingSchoolId} again; ` +
      'the ID is withdrawn and will not be reissued. ' +
      (user.role === 'student'
        ? 'Their registration application and payment receipts are kept.'
        : 'To block access only for a while, deactivate the account instead.'),
    confirmLabel: 'Delete permanently',
    tone: 'primary',
    run: deleteUser,
    success: (user) => `${user.name}'s account (${user.drivingSchoolId}) has been deleted.`,
  },
}

const viewButtonClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand'

// View, Activate / Deactivate and Delete for one account row. Each change is confirmed
// first. `onChanged(message)` is called after a successful change; `onView()` opens details.
function UserActions({ user, onView, onChanged }) {
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const available = [user.status === 'active' ? 'deactivate' : 'activate', 'delete']

  const close = () => {
    setPending(null)
    setError('')
  }

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      await actions[pending].run(user.id)
      const message = actions[pending].success(user)
      setPending(null)
      onChanged(message)
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onView} className={viewButtonClass}>
        <FaEye aria-hidden="true" />
        View
      </button>
      {available.map((key) => {
        const { label, icon: Icon, className } = actions[key]
        return (
          <button
            key={key}
            type="button"
            onClick={() => setPending(key)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${className}`}
          >
            <Icon aria-hidden="true" />
            {label}
          </button>
        )
      })}

      {pending && (
        <ConfirmDialog
          title={actions[pending].title}
          message={actions[pending].message(user)}
          confirmLabel={actions[pending].confirmLabel}
          tone={actions[pending].tone}
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={close}
        />
      )}
    </div>
  )
}

export default UserActions

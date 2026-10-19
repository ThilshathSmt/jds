import { useState } from 'react'
import { FaKey } from 'react-icons/fa6'
import DashboardSection from '../dashboard/DashboardSection'
import FormField from '../registration/FormField'
import PasswordInput from '../auth/PasswordInput'
import { changePassword } from '../../services/profileApi'
import { validateChangePassword } from '../../utils/authValidation'

const emptyValues = { currentPassword: '', newPassword: '', confirmPassword: '' }

const fields = [
  { name: 'currentPassword', label: 'Current Password', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'New Password', autoComplete: 'new-password', hint: 'At least 8 characters' },
  { name: 'confirmPassword', label: 'Confirm New Password', autoComplete: 'new-password' },
]

// Needs the current password; the backend checks it again and signs out other devices.
// Not "Forgot password": that is on the login page.
function ChangePasswordSection({ onToast }) {
  const [values, setValues] = useState(emptyValues)
  const [showErrors, setShowErrors] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const errors = showErrors ? { ...serverErrors, ...validateChangePassword(values) } : serverErrors

  const change = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }))
    setServerErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setShowErrors(true)
    if (Object.keys(validateChangePassword(values)).length > 0) return
    setBusy(true)
    setFormError('')
    try {
      await changePassword(values)
      setValues(emptyValues)
      setShowErrors(false)
      onToast({ variant: 'success', message: 'Your password has been changed. Other devices have been signed out.' })
    } catch (submitError) {
      setServerErrors(submitError.fieldErrors ?? {})
      if (!submitError.fieldErrors || Object.keys(submitError.fieldErrors).length === 0) setFormError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardSection title="Change Password" icon={FaKey}>
      <form noValidate onSubmit={submit} className="grid gap-x-6 gap-y-2 md:grid-cols-3">
        {fields.map(({ name, label, autoComplete, hint }) => (
          <FormField key={name} id={`password-${name}`} label={label} required error={errors[name]} hint={hint}>
            <PasswordInput
              id={`password-${name}`}
              name={name}
              autoComplete={autoComplete}
              value={values[name]}
              onChange={change(name)}
              disabled={busy}
              aria-invalid={errors[name] ? true : undefined}
              aria-describedby={`password-${name}-error`}
              className={`form-input ${errors[name] ? 'form-input-error' : ''}`}
            />
          </FormField>
        ))}

        {formError && (
          <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark md:col-span-3">
            {formError}
          </p>
        )}

        <div className="flex justify-end border-t border-gray-100 pt-5 md:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary !rounded-lg !px-6 !py-3 disabled:cursor-wait disabled:opacity-70"
          >
            <FaKey aria-hidden="true" />
            {busy ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </DashboardSection>
  )
}

export default ChangePasswordSection

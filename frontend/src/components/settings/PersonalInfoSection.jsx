import { useState } from 'react'
import { FaEnvelopeCircleCheck, FaFloppyDisk, FaIdCard, FaLock, FaUser } from 'react-icons/fa6'
import DashboardSection from '../dashboard/DashboardSection'
import FormField from '../registration/FormField'
import PasswordInput from '../auth/PasswordInput'
import { cancelEmailChange, updateProfile } from '../../services/profileApi'
import { validateProfile } from '../../utils/authValidation'

// Name and e-mail of the signed-in account, and its read-only Driving School ID. A new
// e-mail needs the current password and is only used once confirmed from the e-mail sent
// to it. `onSaved(profile)` receives the saved profile. Remounted when it changes.
function PersonalInfoSection({ profile, onSaved, onToast }) {
  const [values, setValues] = useState({ name: profile.name, email: profile.email, currentPassword: '' })
  const [showErrors, setShowErrors] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const emailChanged = values.email.trim().toLowerCase() !== profile.email.toLowerCase()
  const changed = values.name.trim() !== profile.name || emailChanged
  const errors = showErrors ? { ...serverErrors, ...validateProfile(values, { emailChanged }) } : serverErrors

  const change = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }))
    setServerErrors((current) => ({ ...current, [name]: undefined }))
    setNotice(null)
  }

  const save = async (event) => {
    event.preventDefault()
    setShowErrors(true)
    if (Object.keys(validateProfile(values, { emailChanged })).length > 0) return
    setBusy(true)
    setNotice(null)
    try {
      const result = await updateProfile({
        name: values.name.trim(),
        email: values.email.trim(),
        currentPassword: emailChanged ? values.currentPassword : '',
      })
      onSaved(result.profile)
      onToast({ variant: 'success', message: result.message })
    } catch (saveError) {
      setServerErrors(saveError.fieldErrors ?? {})
      setNotice({ variant: 'error', message: saveError.message })
    } finally {
      setBusy(false)
    }
  }

  const cancelPending = async () => {
    setBusy(true)
    try {
      onSaved(await cancelEmailChange())
      onToast({ variant: 'success', message: 'The e-mail change has been cancelled.' })
    } catch (cancelError) {
      setNotice({ variant: 'error', message: cancelError.message })
      setBusy(false)
    }
  }

  const fieldProps = (name) => ({
    id: `profile-${name}`,
    name,
    value: values[name],
    onChange: change(name),
    disabled: busy,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': `profile-${name}-error`,
    className: `form-input ${errors[name] ? 'form-input-error' : ''}`,
  })

  return (
    <DashboardSection title="Personal Information" icon={FaUser}>
      <form noValidate onSubmit={save} className="grid gap-x-6 gap-y-2 md:grid-cols-2">
        <FormField id="profile-drivingSchoolId" label="Driving School ID" hint="Cannot be changed" className="md:col-span-2">
          <div className="relative">
            <FaIdCard aria-hidden="true" className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
            <input
              id="profile-drivingSchoolId"
              type="text"
              value={profile.drivingSchoolId}
              readOnly
              aria-readonly="true"
              className="form-input cursor-not-allowed bg-gray-100 pl-11 font-semibold text-gray-700"
            />
          </div>
        </FormField>

        <FormField id="profile-name" label="Full Name" required error={errors.name}>
          <input type="text" autoComplete="name" maxLength={100} {...fieldProps('name')} />
        </FormField>
        <FormField id="profile-email" label="E-mail Address" required error={errors.email}>
          <input type="email" autoComplete="email" maxLength={150} {...fieldProps('email')} />
        </FormField>

        {emailChanged && (
          <div className="md:col-span-2">
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-brand-soft px-4 py-3 text-sm text-ink">
              <FaLock aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
              To change your e-mail address, enter your current password. We will send a
              confirmation link to the new address; your current address stays in use until
              you open it.
            </p>
            <FormField id="profile-currentPassword" label="Current Password" required error={errors.currentPassword}>
              <PasswordInput autoComplete="current-password" {...fieldProps('currentPassword')} />
            </FormField>
          </div>
        )}

        {profile.pendingEmail && (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between md:col-span-2">
            <p className="flex items-start gap-2">
              <FaEnvelopeCircleCheck aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>
                Waiting for confirmation of <strong>{profile.pendingEmail}</strong>. Open the link we
                sent to that address to start using it.
              </span>
            </p>
            <button
              type="button"
              onClick={cancelPending}
              disabled={busy}
              className="shrink-0 cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold transition hover:bg-amber-100 disabled:opacity-50"
            >
              Cancel change
            </button>
          </div>
        )}

        {notice && (
          <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark md:col-span-2">
            {notice.message}
          </p>
        )}

        <div className="flex justify-end border-t border-gray-100 pt-5 md:col-span-2">
          <button
            type="submit"
            disabled={busy || !changed}
            className="btn btn-primary !rounded-lg !px-6 !py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaFloppyDisk aria-hidden="true" />
            {busy ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </DashboardSection>
  )
}

export default PersonalInfoSection

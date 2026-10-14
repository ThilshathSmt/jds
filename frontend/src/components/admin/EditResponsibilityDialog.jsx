import { useState } from 'react'
import { FaFloppyDisk, FaUserPen } from 'react-icons/fa6'
import Modal from './Modal'
import FormField from '../registration/FormField'
import { getResponsibilityLabel, responsibilityOptions } from '../../data/instructorData'
import { updateResponsibility } from '../../services/userApi'

// Changes what an instructor is responsible for, and nothing else about the account.
// Starts from the current responsibility (empty when none has been assigned yet).
// `onSaved(user)` receives the updated account.
function EditResponsibilityDialog({ user, onSaved, onClose }) {
  const [responsibility, setResponsibility] = useState(user.responsibility ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')

  const save = async (event) => {
    event.preventDefault()
    if (!responsibility) {
      setFieldError('Please select what the instructor is responsible for.')
      return
    }
    setBusy(true)
    setError('')
    try {
      onSaved(await updateResponsibility(user.id, responsibility))
    } catch (saveError) {
      setError(saveError.message)
      setFieldError(saveError.fieldErrors?.responsibility ?? '')
    } finally {
      setBusy(false)
    }
  }

  const unchanged = responsibility === (user.responsibility ?? '')

  return (
    <Modal title="Edit Responsibility" icon={FaUserPen} busy={busy} onClose={onClose}>
      <form noValidate onSubmit={save}>
        <p className="mb-4 text-gray-700">
          <span className="font-semibold text-ink">{user.name}</span> ({user.drivingSchoolId}).
          Currently responsible for:{' '}
          <span className="font-semibold text-ink">
            {getResponsibilityLabel(user.responsibility) ?? 'Not assigned'}
          </span>
        </p>
        <FormField id="edit-responsibility" label="Responsibility For" required error={fieldError}>
          <select
            id="edit-responsibility"
            value={responsibility}
            disabled={busy}
            onChange={(event) => {
              setResponsibility(event.target.value)
              setFieldError('')
              setError('')
            }}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby="edit-responsibility-error"
            className={`form-input ${fieldError ? 'form-input-error' : ''}`}
          >
            <option value="" disabled>
              Select responsibility
            </option>
            {responsibilityOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        {error && !fieldError && (
          <p role="alert" className="mt-2 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn !rounded-lg bg-gray-200 !px-5 !py-2 text-ink hover:bg-gray-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || unchanged}
            className="btn btn-primary !rounded-lg !px-5 !py-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaFloppyDisk aria-hidden="true" />
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default EditResponsibilityDialog

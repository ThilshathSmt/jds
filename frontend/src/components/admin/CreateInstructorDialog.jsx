import { useEffect, useState } from 'react'
import { FaChalkboardUser, FaUserPlus } from 'react-icons/fa6'
import Modal from './Modal'
import AuthMessage from '../auth/AuthMessage'
import PasswordInput from '../auth/PasswordInput'
import useAuthForm from '../auth/useAuthForm'
import FormField from '../registration/FormField'
import { createInstructor, getNextInstructorId } from '../../services/userApi'
import { validateInstructor } from '../../utils/authValidation'

const initialValues = { name: '', email: '', password: '', confirmPassword: '' }

// Admin form for a new instructor account. There is deliberately no role field: the
// backend always creates an instructor and issues the next JDS_INS_ ID itself.
// `onCreated(user)` is called with the saved account.
function CreateInstructorDialog({ onCreated, onClose }) {
  const [nextId, setNextId] = useState('')

  useEffect(() => {
    let active = true
    getNextInstructorId()
      .then((id) => active && setNextId(id))
      .catch(() => active && setNextId(''))
    return () => {
      active = false
    }
  }, [])

  const save = async (values) => {
    onCreated(await createInstructor(values))
  }

  const { errors, formError, submitting, inputProps, handleSubmit } = useAuthForm(
    initialValues,
    validateInstructor,
    save,
  )

  return (
    <Modal title="Create Instructor" icon={FaChalkboardUser} busy={submitting} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit}>
        <FormField id="name" label="Full Name" required error={errors.name}>
          <input type="text" autoComplete="off" maxLength={100} {...inputProps('name')} />
        </FormField>
        <FormField id="email" label="Email Address" required error={errors.email}>
          <input type="email" autoComplete="off" maxLength={150} {...inputProps('email')} />
        </FormField>
        <FormField
          id="drivingSchoolId"
          label="Driving School ID"
          hint="Assigned automatically when saved"
        >
          <input
            id="drivingSchoolId"
            type="text"
            readOnly
            value={nextId || 'JDS_INS_####'}
            aria-describedby="drivingSchoolId-error"
            className="form-input cursor-not-allowed !bg-gray-100 font-semibold text-gray-600"
          />
        </FormField>
        <FormField id="password" label="Password" required error={errors.password}>
          <PasswordInput autoComplete="new-password" {...inputProps('password')} />
        </FormField>
        <FormField
          id="confirmPassword"
          label="Confirm Password"
          required
          error={errors.confirmPassword}
        >
          <PasswordInput autoComplete="new-password" {...inputProps('confirmPassword')} />
        </FormField>

        <p className="mb-4 text-sm text-gray-600">
          Role: <span className="font-semibold text-ink">Instructor</span>. Share the Driving
          School ID and password with the instructor so they can log in.
        </p>

        {formError && <AuthMessage variant="error">{formError}</AuthMessage>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn !rounded-lg bg-gray-200 !px-5 !py-2 text-ink hover:bg-gray-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary !rounded-lg !px-5 !py-2 disabled:cursor-wait disabled:opacity-70"
          >
            <FaUserPlus aria-hidden="true" />
            {submitting ? 'Creating...' : 'Create Instructor'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateInstructorDialog

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaCircleCheck, FaIdCard } from 'react-icons/fa6'
import AuthActions from './AuthActions'
import AuthMessage from './AuthMessage'
import CaptchaPlaceholder from './CaptchaPlaceholder'
import PasswordInput from './PasswordInput'
import useAuthForm from './useAuthForm'
import FormField from '../registration/FormField'
import { useAuth } from '../../context/useAuth'
import { verifyDrivingSchoolId } from '../../services/authApi'
import { validateRegister } from '../../utils/authValidation'

const ALREADY_REGISTERED = 'ALREADY_REGISTERED'
const initialValues = { schoolId: '', password: '', confirmPassword: '', captcha: false }

// Account registration for a student whose application has been approved.
//   1. The student enters their Driving School ID and presses Verify ID: the backend checks
//      the ID (issued, approved application, no account yet) and returns the application's
//      name and e-mail, shown read-only.
//   2. The student chooses a password, ticks the CAPTCHA box and registers. Only the ID and
//      the password are sent; the backend takes the name, e-mail and role itself.
function RegisterForm() {
  const { register } = useAuth()
  const navigate = useNavigate()
  // { drivingSchoolId, name, email } once the ID has been verified
  const [verified, setVerified] = useState(null)
  const [verifying, setVerifying] = useState(false)
  // { message, alreadyRegistered }
  const [verifyError, setVerifyError] = useState(null)

  const createAccount = async (values) => {
    await register(values)
    navigate('/login', { state: { registered: true } })
  }

  const { values, errors, formError, formErrorCode, submitting, setField, inputProps, handleSubmit } =
    useAuthForm(initialValues, validateRegister, createAccount)

  const verify = async () => {
    const schoolId = values.schoolId.trim()
    if (!schoolId) {
      setVerifyError({ message: 'Enter your Driving School ID.' })
      return
    }
    setVerifying(true)
    setVerifyError(null)
    try {
      setVerified(await verifyDrivingSchoolId(schoolId))
    } catch (error) {
      setVerifyError({ message: error.message, alreadyRegistered: error.code === ALREADY_REGISTERED })
    } finally {
      setVerifying(false)
    }
  }

  // Changing the ID after verifying means it has to be verified again
  const idProps = inputProps('schoolId')
  const onIdChange = (event) => {
    idProps.onChange(event)
    setVerified(null)
    setVerifyError(null)
  }

  const alreadyRegistered = verifyError?.alreadyRegistered || formErrorCode === ALREADY_REGISTERED

  return (
    <form
      noValidate
      onSubmit={(event) => {
        if (!verified) {
          event.preventDefault()
          verify()
          return
        }
        handleSubmit(event)
      }}
      className="space-y-4"
    >
      <div>
        <FormField id="schoolId" label="Driving School Id" required error={errors.schoolId}>
          <div className="flex gap-2">
            <input
              type="text"
              autoComplete="username"
              placeholder="JDS_STD_0001"
              {...idProps}
              onChange={onIdChange}
              className={`${idProps.className} flex-1`}
            />
            <button
              type="button"
              onClick={verify}
              disabled={verifying || Boolean(verified)}
              className="btn btn-primary shrink-0 !rounded-lg !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {verified ? <FaCircleCheck aria-hidden="true" /> : <FaIdCard aria-hidden="true" />}
              {verifying ? 'Checking...' : verified ? 'Verified' : 'Verify ID'}
            </button>
          </div>
        </FormField>

        {verifyError && (
          <AuthMessage variant="error">
            {verifyError.message}{' '}
            {verifyError.alreadyRegistered && (
              <Link to="/login" className="font-semibold underline">
                Go to Login
              </Link>
            )}
          </AuthMessage>
        )}

        {!verified ? (
          <p className="mt-2 text-sm text-gray-600">
            Enter the Driving School ID you received when the school approved your application,
            then press Verify ID.
          </p>
        ) : (
          <>
            <FormField id="name" label="Your Name" hint="From your approved application">
              <input id="name" type="text" value={verified.name} readOnly aria-readonly="true" className="form-input cursor-not-allowed !bg-gray-100 text-gray-700" />
            </FormField>
            <FormField id="email" label="E-mail Address" hint="From your approved application">
              <input id="email" type="email" value={verified.email} readOnly aria-readonly="true" className="form-input cursor-not-allowed !bg-gray-100 text-gray-700" />
            </FormField>
            <FormField id="password" label="Password" required error={errors.password}>
              <PasswordInput autoComplete="new-password" {...inputProps('password')} />
            </FormField>
            <FormField id="confirmPassword" label="Confirm Password" required error={errors.confirmPassword}>
              <PasswordInput autoComplete="new-password" placeholder="Confirm Password" {...inputProps('confirmPassword')} />
            </FormField>
          </>
        )}
      </div>

      {verified && (
        <CaptchaPlaceholder checked={values.captcha} onChange={(checked) => setField('captcha', checked)} error={errors.captcha} />
      )}

      {formError && (
        <AuthMessage variant="error">
          {formError}{' '}
          {alreadyRegistered && !verifyError && (
            <Link to="/login" className="font-semibold underline">
              Go to Login
            </Link>
          )}
        </AuthMessage>
      )}

      <AuthActions
        submitLabel={verified ? 'Register' : 'Verify ID'}
        switchLabel="Login"
        switchTo="/login"
        submitting={submitting || verifying}
      />
    </form>
  )
}

export default RegisterForm

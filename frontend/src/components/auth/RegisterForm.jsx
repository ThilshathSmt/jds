import { useNavigate } from 'react-router-dom'
import AuthActions from './AuthActions'
import AuthMessage from './AuthMessage'
import CaptchaPlaceholder from './CaptchaPlaceholder'
import useAuthForm from './useAuthForm'
import FormField from '../registration/FormField'
import { useAuth } from '../../context/useAuth'
import { validateRegister } from '../../utils/authValidation'

const initialValues = { schoolId: '', name: '', email: '', password: '', confirmPassword: '' }

// There is deliberately no role field: the backend assigns the role from the Driving School ID
const fields = [
  { name: 'schoolId', label: 'Driving School Id', type: 'text', autoComplete: 'username' },
  { name: 'name', label: 'Your Name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'E-mail Address', type: 'email', autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password' },
  {
    name: 'confirmPassword',
    label: 'Confirm Password',
    type: 'password',
    autoComplete: 'new-password',
    placeholder: 'Confirm Password',
  },
]

function RegisterForm() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const createAccount = async (values) => {
    await register(values)
    navigate('/login', { state: { registered: true } })
  }

  const { errors, formError, submitting, inputProps, handleSubmit } = useAuthForm(
    initialValues,
    validateRegister,
    createAccount,
  )

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <div>
        {fields.map(({ name, label, ...input }) => (
          <FormField key={name} id={name} label={label} error={errors[name]}>
            <input required {...input} {...inputProps(name)} />
          </FormField>
        ))}
      </div>

      <CaptchaPlaceholder />

      {formError && <AuthMessage variant="error">{formError}</AuthMessage>}

      <AuthActions
        submitLabel="Register"
        switchLabel="Login"
        switchTo="/login"
        submitting={submitting}
      />
    </form>
  )
}

export default RegisterForm

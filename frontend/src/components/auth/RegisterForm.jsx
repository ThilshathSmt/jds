import AuthActions from './AuthActions'
import AuthMessage from './AuthMessage'
import CaptchaPlaceholder from './CaptchaPlaceholder'
import useAuthForm from './useAuthForm'
import FormField from '../registration/FormField'
import { validateRegister } from '../../utils/authValidation'

const initialValues = { schoolId: '', name: '', email: '', password: '', confirmPassword: '' }

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
  // TODO: On a valid submit, call the backend account-registration API.
  const { errors, isValidSubmit, inputProps, handleSubmit } = useAuthForm(
    initialValues,
    validateRegister,
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

      {isValidSubmit && (
        <AuthMessage>
          Registration form is valid. Backend registration will be connected later.
        </AuthMessage>
      )}

      <AuthActions submitLabel="Register" switchLabel="Login" switchTo="/login" />
    </form>
  )
}

export default RegisterForm

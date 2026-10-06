import { useState } from 'react'
import FormField from './FormField'
import StepActions from './StepActions'
import { normalizeNic } from '../../utils/registrationValidation'

const MOBILE_LENGTH = 10
const NIC_MAX_LENGTH = 12

function PersonalDetailsStep({ formData, errors, onChange }) {
  // An error is shown once its field has been edited or left
  const [touched, setTouched] = useState({})
  const isValid = Object.keys(errors).length === 0

  // Shared props for every control in this step
  const field = (name, transform = (value) => value) => {
    const error = touched[name] ? errors[name] : undefined
    return {
      id: name,
      name,
      value: formData[name],
      onChange: (event) => {
        onChange(name, transform(event.target.value))
        setTouched((fields) => ({ ...fields, [name]: true }))
      },
      onBlur: () => setTouched((fields) => ({ ...fields, [name]: true })),
      'aria-invalid': error ? true : undefined,
      'aria-describedby': `${name}-error`,
      className: `form-input ${error ? 'form-input-error' : ''}`,
    }
  }
  const errorFor = (name) => (touched[name] ? errors[name] : undefined)

  return (
    <>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <FormField id="fullName" label="Full Name" required error={errorFor('fullName')}>
          <input type="text" autoComplete="name" required {...field('fullName')} />
        </FormField>

        <FormField
          id="mobile"
          label="Mobile Number"
          required
          error={errorFor('mobile')}
          hint={`${formData.mobile.length} / ${MOBILE_LENGTH}`}
        >
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="0771234567"
            maxLength={MOBILE_LENGTH}
            required
            {...field('mobile', (value) => value.replace(/\D/g, ''))}
          />
        </FormField>

        <FormField id="email" label="Email Address" error={errorFor('email')} hint="Optional">
          <input type="email" autoComplete="email" {...field('email')} />
        </FormField>

        <FormField
          id="nic"
          label="NIC"
          required
          error={errorFor('nic')}
          hint={`${formData.nic.length} / ${NIC_MAX_LENGTH}`}
        >
          <input
            type="text"
            autoComplete="off"
            placeholder="123456789V or 200012345678"
            maxLength={NIC_MAX_LENGTH}
            required
            {...field('nic', normalizeNic)}
          />
        </FormField>

        <FormField
          id="address"
          label="Address"
          required
          error={errorFor('address')}
          className="sm:col-span-2"
        >
          <textarea rows={3} autoComplete="street-address" required {...field('address')} />
        </FormField>
      </div>

      {!isValid && (
        <p className="mt-2 text-right text-sm text-gray-500">
          Complete all required fields correctly to continue.
        </p>
      )}
      <StepActions nextDisabled={!isValid} />
    </>
  )
}

export default PersonalDetailsStep

import StepActions from './StepActions'
import { formatPrice, packages } from '../../data/registrationData'

function PackageDetailsStep({ formData, errors, showErrors, onChange, onBack }) {
  const error = showErrors ? errors.packageId : undefined

  return (
    <>
      <fieldset aria-describedby="packageId-error">
        <legend className="mb-3 font-semibold text-ink">
          Select License Type / Driving School Fees
          <span className="text-brand" aria-hidden="true">
            {' '}
            *
          </span>
        </legend>
        <div className="space-y-3">
          {packages.map(({ id, name, price }) => {
            const selected = formData.packageId === id
            return (
              <label
                key={id}
                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${
                  selected
                    ? 'border-brand bg-brand-soft'
                    : 'border-gray-200 bg-white hover:border-brand/40'
                }`}
              >
                <input
                  type="radio"
                  name="packageId"
                  value={id}
                  checked={selected}
                  onChange={() => onChange('packageId', id)}
                  className="h-5 w-5 shrink-0 accent-brand"
                />
                <span className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="font-medium text-ink">{name}</span>
                  <span className="font-bold whitespace-nowrap text-brand">
                    {formatPrice(price)}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
        <p id="packageId-error" role="alert" className="mt-2 min-h-5 text-sm text-brand">
          {error}
        </p>
      </fieldset>

      <StepActions onBack={onBack} />
    </>
  )
}

export default PackageDetailsStep

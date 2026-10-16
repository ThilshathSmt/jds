import { useCallback, useEffect, useState } from 'react'
import {
  FaBoxOpen,
  FaFloppyDisk,
  FaPen,
  FaPlus,
  FaSliders,
  FaTags,
  FaXmark,
} from 'react-icons/fa6'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import StatusBadge from '../../components/dashboard/StatusBadge'
import Toast from '../../components/dashboard/Toast'
import { formatPrice, getMinimumPayment } from '../../data/registrationData'
import { createPackage, getAdminSettings, updatePackage, updateSettings } from '../../services/settingsApi'
import { formatDateTime } from '../../utils/formatUtils'
import { formatFee } from '../../utils/licenceExamUtils'

// The same limits the backend checks; it decides in the end
const PRICE_MAX = 10_000_000
const FEE_MAX = 1_000_000
const NAME_MAX_LENGTH = 150

const isWhole = (text) => /^\d+$/.test(String(text).trim())

const validatePackage = ({ name, price }) => {
  const errors = {}
  if (!name.trim()) errors.name = 'Package name is required.'
  else if (name.trim().length > NAME_MAX_LENGTH) errors.name = `At most ${NAME_MAX_LENGTH} characters.`
  if (!isWhole(price) || Number(price) < 1 || Number(price) > PRICE_MAX) {
    errors.price = 'Enter a whole amount in LKR greater than 0.'
  }
  return errors
}

const validateSettings = ({ advancePaymentPercent, reattemptFee, practicalReattemptFee }) => {
  const errors = {}
  const percent = Number(advancePaymentPercent)
  if (!isWhole(advancePaymentPercent) || percent < 1 || percent > 100) {
    errors.advancePaymentPercent = 'Enter a whole percentage from 1 to 100.'
  }
  const fee = Number(reattemptFee)
  if (!isWhole(reattemptFee) || fee < 1 || fee > FEE_MAX) {
    errors.reattemptFee = 'Enter a whole amount in LKR greater than 0.'
  }
  const practicalFee = Number(practicalReattemptFee)
  if (!isWhole(practicalReattemptFee) || practicalFee < 1 || practicalFee > FEE_MAX) {
    errors.practicalReattemptFee = 'Enter a whole amount in LKR greater than 0.'
  }
  return errors
}

const inputClass = (error) => `form-input ${error ? 'form-input-error' : ''}`
const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-1 text-sm text-danger">
      {message}
    </p>
  ) : null

const smallButton =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60'

// The advance payment percentage and the reattempt fee
function SettingsForm({ settings, onSaved, onToast }) {
  const [values, setValues] = useState({
    advancePaymentPercent: String(settings.advancePaymentPercent),
    reattemptFee: String(settings.reattemptFee),
    practicalReattemptFee: String(settings.practicalReattemptFee),
  })
  const [serverErrors, setServerErrors] = useState({})
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)

  const errors = { ...validateSettings(values), ...serverErrors }
  const errorFor = (name) => (showErrors || serverErrors[name] ? errors[name] : undefined)
  const changed =
    Number(values.advancePaymentPercent) !== settings.advancePaymentPercent ||
    Number(values.reattemptFee) !== settings.reattemptFee ||
    Number(values.practicalReattemptFee) !== settings.practicalReattemptFee

  // The effect of the percentage on the cheapest active package paid in part, as an example
  const example = settings.packages
    .filter((item) => item.isActive && item.price > settings.fullPaymentThreshold)
    .sort((a, b) => a.price - b.price)[0]
  const percentValid = !validateSettings(values).advancePaymentPercent

  const update = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }))
    setServerErrors((current) => ({ ...current, [name]: undefined }))
  }

  const save = async (event) => {
    event.preventDefault()
    if (Object.values(validateSettings(values)).length > 0) {
      setShowErrors(true)
      return
    }
    setBusy(true)
    try {
      const saved = await updateSettings({
        advancePaymentPercent: Number(values.advancePaymentPercent),
        reattemptFee: Number(values.reattemptFee),
        practicalReattemptFee: Number(values.practicalReattemptFee),
      })
      setShowErrors(false)
      onSaved(saved)
      onToast({ variant: 'success', message: 'Settings saved. They apply to new applications and newly recorded failed attempts.' })
    } catch (saveError) {
      setServerErrors(saveError.fieldErrors ?? {})
      onToast({ variant: 'error', message: saveError.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={save} className="grid gap-6 md:grid-cols-2">
      <div>
        <label htmlFor="advancePaymentPercent" className="mb-1.5 block font-semibold text-ink">
          Minimum Registration Advance Payment (%) <span className="text-danger">*</span>
        </label>
        <input
          id="advancePaymentPercent"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          step={1}
          value={values.advancePaymentPercent}
          onChange={update('advancePaymentPercent')}
          aria-invalid={Boolean(errorFor('advancePaymentPercent'))}
          aria-describedby="advancePaymentPercent-help advancePaymentPercent-error"
          className={inputClass(errorFor('advancePaymentPercent'))}
        />
        <FieldError id="advancePaymentPercent-error" message={errorFor('advancePaymentPercent')} />
        <p id="advancePaymentPercent-help" className="mt-1 text-sm text-gray-600">
          {example && percentValid
            ? `Example: ${example.name} (${formatPrice(example.price)}) needs at least ${formatPrice(
                getMinimumPayment(example.price, {
                  advancePaymentPercent: Number(values.advancePaymentPercent),
                  fullPaymentThreshold: settings.fullPaymentThreshold,
                }).minimumPayment,
              )}. `
            : ''}
          Packages up to {formatPrice(settings.fullPaymentThreshold)} are always paid in full.
        </p>
      </div>
      <div>
        <label htmlFor="reattemptFee" className="mb-1.5 block font-semibold text-ink">
          Examination Reattempt Fee (LKR) <span className="text-danger">*</span>
        </label>
        <input
          id="reattemptFee"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={values.reattemptFee}
          onChange={update('reattemptFee')}
          aria-invalid={Boolean(errorFor('reattemptFee'))}
          aria-describedby="reattemptFee-help reattemptFee-error"
          className={inputClass(errorFor('reattemptFee'))}
        />
        <FieldError id="reattemptFee-error" message={errorFor('reattemptFee')} />
        <p id="reattemptFee-help" className="mt-1 text-sm text-gray-600">
          Charged after a failed 1st or 2nd attempt of a cycle, before the next date can be
          booked. Fees already owed keep the amount set when the failure was recorded.
        </p>
      </div>
      <div>
        <label htmlFor="practicalReattemptFee" className="mb-1.5 block font-semibold text-ink">
          Practical Test Reattempt Fee (LKR) <span className="text-danger">*</span>
        </label>
        <input
          id="practicalReattemptFee"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={values.practicalReattemptFee}
          onChange={update('practicalReattemptFee')}
          aria-invalid={Boolean(errorFor('practicalReattemptFee'))}
          aria-describedby="practicalReattemptFee-help practicalReattemptFee-error"
          className={inputClass(errorFor('practicalReattemptFee'))}
        />
        <FieldError id="practicalReattemptFee-error" message={errorFor('practicalReattemptFee')} />
        <p id="practicalReattemptFee-help" className="mt-1 text-sm text-gray-600">
          Charged after a failed 1st or 2nd practical driving test, before the next test is
          scheduled. The first practical test of every cycle is free; fees already owed keep their
          amount.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
        <p className="text-xs text-gray-500">
          Last changed: advance payment{' '}
          {settings.settingsUpdatedAt.advancePaymentPercent ? formatDateTime(settings.settingsUpdatedAt.advancePaymentPercent) : '–'}
          , reattempt fee{' '}
          {settings.settingsUpdatedAt.reattemptFee ? formatDateTime(settings.settingsUpdatedAt.reattemptFee) : '–'}
          , practical fee{' '}
          {settings.settingsUpdatedAt.practicalReattemptFee ? formatDateTime(settings.settingsUpdatedAt.practicalReattemptFee) : '–'}
        </p>
        <button
          type="submit"
          disabled={busy || !changed}
          className="btn btn-primary !rounded-lg !px-5 !py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FaFloppyDisk aria-hidden="true" />
          {busy ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}

// One package: shown, or edited in place
function PackageRow({ item, settings, onSaved, onToast }) {
  const [editing, setEditing] = useState(null)
  const [serverErrors, setServerErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const errors = editing ? { ...validatePackage(editing), ...serverErrors } : {}
  const { minimumPayment } = getMinimumPayment(item.price, settings)

  const start = () => {
    setEditing({ name: item.name, price: String(item.price), isActive: item.isActive })
    setServerErrors({})
  }
  const change = (name, value) => {
    setEditing((current) => ({ ...current, [name]: value }))
    setServerErrors((current) => ({ ...current, [name]: undefined }))
  }

  const save = async () => {
    if (Object.keys(validatePackage(editing)).length > 0) return
    setBusy(true)
    try {
      const saved = await updatePackage(item.id, {
        name: editing.name.trim(),
        price: Number(editing.price),
        isActive: editing.isActive,
      })
      setEditing(null)
      onSaved(saved)
      onToast({ variant: 'success', message: `${saved.name} saved. Submitted applications keep their original price.` })
    } catch (saveError) {
      setServerErrors(saveError.fieldErrors ?? {})
      onToast({ variant: 'error', message: saveError.message })
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <tr data-package-id={item.id} className="align-top">
        <td className="px-4 py-3 font-semibold text-ink">{item.name}</td>
        <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatPrice(item.price)}</td>
        <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatPrice(minimumPayment)}</td>
        <td className="px-4 py-3">
          <StatusBadge status={item.isActive ? 'Active' : 'Inactive'} />
        </td>
        <td className="px-4 py-3 text-right">
          <button type="button" onClick={start} className={`${smallButton} border border-gray-300 bg-white text-ink hover:border-brand hover:text-brand`}>
            <FaPen aria-hidden="true" />
            Edit
          </button>
        </td>
      </tr>
    )
  }

  const idPrefix = `package-${item.id}`
  return (
    <tr data-package-id={item.id} className="bg-brand-soft/40 align-top">
      <td className="px-4 py-3">
        <label htmlFor={`${idPrefix}-name`} className="sr-only">Package name</label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          maxLength={NAME_MAX_LENGTH}
          value={editing.name}
          onChange={(event) => change('name', event.target.value)}
          aria-invalid={Boolean(errors.name)}
          className={`${inputClass(errors.name)} min-w-56`}
        />
        <FieldError message={errors.name} />
      </td>
      <td className="px-4 py-3">
        <label htmlFor={`${idPrefix}-price`} className="sr-only">Price in LKR</label>
        <input
          id={`${idPrefix}-price`}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={editing.price}
          onChange={(event) => change('price', event.target.value)}
          aria-invalid={Boolean(errors.price)}
          className={`${inputClass(errors.price)} w-32`}
        />
        <FieldError message={errors.price} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        {errors.price ? '–' : formatPrice(getMinimumPayment(Number(editing.price), settings).minimumPayment)}
      </td>
      <td className="px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={editing.isActive}
            onChange={(event) => change('isActive', event.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          Active
        </label>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(null)} disabled={busy} className={`${smallButton} bg-gray-200 text-ink hover:bg-gray-300`}>
            <FaXmark aria-hidden="true" />
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || Object.keys(errors).length > 0}
            className={`${smallButton} bg-brand text-white hover:bg-brand-dark`}
          >
            <FaFloppyDisk aria-hidden="true" />
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </td>
    </tr>
  )
}

// A new package, offered straight away
function AddPackageForm({ onAdded, onToast }) {
  const [values, setValues] = useState({ name: '', price: '' })
  const [showErrors, setShowErrors] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const errors = { ...validatePackage(values), ...serverErrors }
  const errorFor = (name) => (showErrors || serverErrors[name] ? errors[name] : undefined)
  const change = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }))
    setServerErrors((current) => ({ ...current, [name]: undefined }))
  }

  const add = async (event) => {
    event.preventDefault()
    if (Object.keys(validatePackage(values)).length > 0) {
      setShowErrors(true)
      return
    }
    setBusy(true)
    try {
      const created = await createPackage({ name: values.name.trim(), price: Number(values.price), isActive: true })
      setValues({ name: '', price: '' })
      setShowErrors(false)
      onAdded(created)
      onToast({ variant: 'success', message: `${created.name} added and now offered on the registration forms.` })
    } catch (addError) {
      setServerErrors(addError.fieldErrors ?? {})
      onToast({ variant: 'error', message: addError.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={add} className="mt-6 grid gap-4 rounded-xl border border-dashed border-gray-300 p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-start">
      <div>
        <label htmlFor="new-package-name" className="mb-1.5 block text-sm font-semibold text-ink">New package name</label>
        <input id="new-package-name" type="text" maxLength={NAME_MAX_LENGTH} value={values.name} onChange={change('name')} aria-invalid={Boolean(errorFor('name'))} className={inputClass(errorFor('name'))} />
        <FieldError message={errorFor('name')} />
      </div>
      <div>
        <label htmlFor="new-package-price" className="mb-1.5 block text-sm font-semibold text-ink">Price (LKR)</label>
        <input id="new-package-price" type="number" inputMode="numeric" min={1} step={1} value={values.price} onChange={change('price')} aria-invalid={Boolean(errorFor('price'))} className={inputClass(errorFor('price'))} />
        <FieldError message={errorFor('price')} />
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary !rounded-lg !px-5 !py-2.5 sm:mt-7 disabled:cursor-wait disabled:opacity-70">
        <FaPlus aria-hidden="true" />
        {busy ? 'Adding...' : 'Add Package'}
      </button>
    </form>
  )
}

// Admin-only page: the packages offered on the registration forms, the minimum advance
// payment and the examination reattempt fee. Everything is loaded from and saved to the
// backend, which applies the changes to new applications and new failed attempts only.
function PackagesSettings() {
  const [settings, setSettings] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    getAdminSettings()
      .then((loaded) => active && setSettings(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [])

  const replacePackage = (saved) =>
    setSettings((current) => ({
      ...current,
      packages: current.packages.map((item) => (item.id === saved.id ? saved : item)),
    }))

  return (
    <>
      <DashboardWelcome
        title="Packages & Exam Penalties"
        message="Package prices, the minimum registration payment and the examination reattempt fee."
        icon={FaSliders}
      />

      {!settings ? (
        <p role={error ? 'alert' : 'status'} className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
          {error || 'Loading settings...'}
        </p>
      ) : (
        <>
          <DashboardSection title="Payment & Penalty Settings" icon={FaTags}>
            {/* Remounted after a save so the form starts from the saved values */}
            <SettingsForm
              key={`${settings.advancePaymentPercent}-${settings.reattemptFee}-${settings.practicalReattemptFee}`}
              settings={settings}
              onSaved={setSettings}
              onToast={setToast}
            />
            <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-ink">
              Current reattempt fee: <span className="font-semibold">{formatFee(settings.reattemptFee)}</span>.
              The first attempt of every approved application is free; after a third failure the
              account is locked and a new application is required instead of a fee.
            </p>
          </DashboardSection>

          <DashboardSection title="Driving School Packages" icon={FaBoxOpen}>
            <p className="mb-4 text-sm text-gray-600">
              Active packages are offered on the Apply Now and reapplication forms. Submitted
              applications keep the package name, price and minimum payment they were submitted with.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <caption className="sr-only">Driving school packages</caption>
                <thead className="bg-gray-50 text-xs tracking-wide text-gray-600 uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Package</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Min. Registration Payment</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {settings.packages.map((item) => (
                    <PackageRow key={item.id} item={item} settings={settings} onSaved={replacePackage} onToast={setToast} />
                  ))}
                </tbody>
              </table>
            </div>
            <AddPackageForm
              onAdded={(created) => setSettings((current) => ({ ...current, packages: [...current.packages, created] }))}
              onToast={setToast}
            />
          </DashboardSection>
        </>
      )}

      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}

export default PackagesSettings

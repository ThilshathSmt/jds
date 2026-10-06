import BankDetails from './BankDetails'
import BranchDetails from './BranchDetails'
import FileUpload from './FileUpload'
import PaymentInstructions from './PaymentInstructions'
import PaymentSummary from './PaymentSummary'
import StepActions from './StepActions'
import {
  PAYMENT_METHODS,
  getMinimumPayment,
  packages,
  paymentMethods,
} from '../../data/registrationData'
import { getReceiptError } from '../../utils/registrationValidation'

const detailsByMethod = {
  [PAYMENT_METHODS.bankTransfer]: BankDetails,
  [PAYMENT_METHODS.visitBranch]: BranchDetails,
}

function PaymentDetailsStep({ formData, errors, showErrors, onChange, onBack }) {
  const selectedPackage = packages.find(({ id }) => id === formData.packageId)
  // Step 3 is only reachable after a package is chosen; the fallback keeps rendering safe
  const { minimumPayment, isFullPayment } = getMinimumPayment(selectedPackage?.price ?? 0)
  const MethodDetails = detailsByMethod[formData.paymentMethod]
  // A bad file is flagged as soon as it is chosen; other errors wait for a submit attempt
  const receiptError = showErrors ? errors.receipt : getReceiptError(formData.receipt)

  return (
    <>
      {selectedPackage && (
        <div className="mb-6 space-y-4">
          <PaymentSummary selectedPackage={selectedPackage} minimumPayment={minimumPayment} />
          <PaymentInstructions minimumPayment={minimumPayment} isFullPayment={isFullPayment} />
        </div>
      )}

      <fieldset aria-describedby="paymentMethod-error">
        <legend className="mb-3 font-semibold text-ink">
          How would you like to pay?
          <span className="text-brand" aria-hidden="true">
            {' '}
            *
          </span>
        </legend>
        <div className="space-y-3">
          {paymentMethods.map(({ id, label }) => (
            <label key={id} className="flex w-fit cursor-pointer items-center gap-3 text-ink">
              <input
                type="radio"
                name="paymentMethod"
                value={id}
                checked={formData.paymentMethod === id}
                onChange={() => onChange('paymentMethod', id)}
                className="h-5 w-5 accent-brand"
              />
              {label}
            </label>
          ))}
        </div>
        <p id="paymentMethod-error" role="alert" className="mt-2 min-h-5 text-sm text-brand">
          {showErrors ? errors.paymentMethod : undefined}
        </p>
      </fieldset>

      {MethodDetails && (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <MethodDetails />
          <FileUpload
            id="receipt"
            label="Upload Deposit Slip / E-Document"
            file={formData.receipt}
            error={receiptError}
            onChange={(file) => onChange('receipt', file)}
          />
        </div>
      )}

      <StepActions onBack={onBack} nextLabel="Submit Registration" />
    </>
  )
}

export default PaymentDetailsStep

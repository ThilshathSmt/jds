import { FaCircleInfo } from 'react-icons/fa6'
import InfoCard from './InfoCard'
import { formatAmount } from '../../data/registrationData'

// `advancePaymentPercent` is the admin-configured minimum share, from the backend
function PaymentInstructions({ minimumPayment, isFullPayment, advancePaymentPercent }) {
  const amount = formatAmount(minimumPayment)

  return (
    <InfoCard icon={FaCircleInfo} title="Payment Instructions">
      <div className="space-y-2 text-gray-700">
        <p>To complete your registration, you must pay the required registration amount.</p>
        <p className="font-semibold text-ink">
          {isFullPayment
            ? `Full payment of ${amount} is required for registration.`
            : `A minimum payment of ${advancePaymentPercent}% (${amount}) is required for registration.`}
        </p>
        {!isFullPayment && (
          <p>Remaining balance can be paid later according to the school&apos;s payment terms.</p>
        )}
      </div>
    </InfoCard>
  )
}

export default PaymentInstructions

import { formatPrice } from '../../data/registrationData'

function PaymentSummary({ selectedPackage, minimumPayment }) {
  const rows = [
    { label: 'Selected Package', value: selectedPackage.name },
    { label: 'Package Price', value: formatPrice(selectedPackage.price) },
    { label: 'Minimum Registration Payment', value: formatPrice(minimumPayment), highlight: true },
  ]

  return (
    <dl className="divide-y divide-gray-200 rounded-xl bg-gray-50 px-4 text-sm">
      {rows.map(({ label, value, highlight }) => (
        <div
          key={label}
          className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <dt className="text-gray-700">{label}</dt>
          <dd className={`font-semibold sm:text-right ${highlight ? 'text-brand' : 'text-ink'}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default PaymentSummary

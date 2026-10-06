import { FaBuildingColumns } from 'react-icons/fa6'
import InfoCard from './InfoCard'
import hnbLogo from '../../assets/images/hnb-logo.png'
import { bankDetails } from '../../data/registrationData'

const rows = [
  { label: 'Bank Name', value: bankDetails.bankName },
  { label: 'Bank Branch', value: bankDetails.bankBranch },
  { label: 'Account Number', value: bankDetails.accountNumber },
  { label: 'Account Name', value: bankDetails.accountName },
]

function BankDetails() {
  return (
    <InfoCard icon={FaBuildingColumns} title="Bank Transfer Details">
      <img
        src={hnbLogo}
        alt="Hatton National Bank logo"
        className="mb-4 h-14 w-auto rounded-lg bg-white p-2"
      />
      <dl className="space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-ink">{label}:</dt>
            <dd className="text-gray-700">{value}</dd>
          </div>
        ))}
      </dl>
    </InfoCard>
  )
}

export default BankDetails

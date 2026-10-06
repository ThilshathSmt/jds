import { FaLocationDot } from 'react-icons/fa6'
import InfoCard from './InfoCard'
import { locations } from '../../data/siteData'

// Branch addresses are the same placeholder data used by the landing page's "Our Locations" section
function BranchDetails() {
  return (
    <InfoCard icon={FaLocationDot} title="Pay at a Branch">
      <ul className="space-y-3">
        {locations.map(({ name, address, phone }) => (
          <li key={name}>
            <p className="font-semibold text-ink">{name} Branch</p>
            <p className="text-gray-700">{address}</p>
            <p className="text-gray-700">{phone}</p>
          </li>
        ))}
      </ul>
    </InfoCard>
  )
}

export default BranchDetails

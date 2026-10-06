import LocationCard from './LocationCard'
import SectionHeading from './SectionHeading'
import { locations } from '../data/siteData'

function LocationSection() {
  return (
    <section id="locations" className="bg-gray-50 py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading
          title="Our Locations"
          subtitle="Visit the branch closest to you to get started."
        />
        <ul className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {locations.map((location) => (
            <li key={location.name}>
              <LocationCard {...location} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default LocationSection

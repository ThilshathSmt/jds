import LocationCard from './LocationCard'
import SectionHeading from './SectionHeading'
import { locations } from '../data/siteData'
import ScrollReveal from './ScrollReveal'

function LocationSection() {
  return (
    <section id="locations" className="bg-gray-50 py-16 sm:py-20">
      <div className="container-page">
        <ScrollReveal>
          <SectionHeading
            title="Our Locations"
            subtitle="Visit the branch closest to you to get started."
          />
        </ScrollReveal>
        <ul className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {locations.map((location, index) => (
            <ScrollReveal as="li" key={location.name} delay={index * 90}>
              <LocationCard {...location} />
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default LocationSection

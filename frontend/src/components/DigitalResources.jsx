import ResourceCard from './ResourceCard'
import SectionHeading from './SectionHeading'
import { resources } from '../data/siteData'

function DigitalResources() {
  return (
    <section id="resources" className="bg-gray-50 py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading
          title="Explore Our Digital Resources"
          subtitle="Everything you need to learn, practise and prepare, all in one place."
        />
        <ul className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {resources.map((resource) => (
            <li key={resource.title}>
              <ResourceCard {...resource} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default DigitalResources

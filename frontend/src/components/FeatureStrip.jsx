import { features } from '../data/siteData'

function FeatureStrip() {
  return (
    <section aria-label="Why choose Jeslan Driving School" className="bg-brand text-white">
      <ul className="container-page grid gap-x-6 gap-y-8 py-8 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-white/25">
        {features.map(({ title, description, icon: Icon }) => (
          <li key={title} className="flex items-center gap-4 xl:px-6 xl:first:pl-0 xl:last:pr-0">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-2xl text-brand">
              <Icon aria-hidden="true" />
            </span>
            <div>
              <h3 className="leading-snug font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-white/85">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default FeatureStrip

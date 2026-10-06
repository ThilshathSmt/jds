import { FaLocationDot, FaMapLocationDot, FaPhone } from 'react-icons/fa6'

function LocationCard({ name, address, phone }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Map placeholder: Google Maps will be integrated here later */}
      <div className="flex h-40 flex-col items-center justify-center gap-2 bg-brand-soft text-brand">
        <FaMapLocationDot className="text-4xl" aria-hidden="true" />
        <span className="text-sm font-medium text-brand-dark">Map coming soon</span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="flex items-center gap-3 text-xl font-bold text-ink">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <FaLocationDot aria-hidden="true" />
          </span>
          {name} Branch
        </h3>
        <address className="mt-4 space-y-2 text-gray-600 not-italic">
          <p>{address}</p>
          <p className="flex items-center gap-2">
            <FaPhone className="text-brand" aria-hidden="true" />
            {phone}
          </p>
        </address>
        <button type="button" className="btn btn-outline mt-6 self-start !px-5 !py-2 !text-sm">
          View Location
        </button>
      </div>
    </article>
  )
}

export default LocationCard

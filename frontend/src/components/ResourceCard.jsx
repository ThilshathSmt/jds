import { FaArrowRight } from 'react-icons/fa6'

function ResourceCard({ title, description, action, icon: Icon }) {
  return (
    <article className="group flex h-full flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-brand/40 hover:shadow-xl">
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      <span className="my-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-4xl text-brand transition duration-300 group-hover:bg-brand group-hover:text-white">
        <Icon aria-hidden="true" />
      </span>
      <p className="mb-6 text-sm text-gray-600">{description}</p>
      {/* Placeholder: will navigate to the relevant page once it exists */}
      <button
        type="button"
        className="mt-auto inline-flex cursor-pointer items-center gap-2 rounded-full border border-transparent px-4 py-2 font-semibold text-brand transition group-hover:border-brand/40 hover:bg-brand-soft"
      >
        {action}
        <FaArrowRight aria-hidden="true" className="transition group-hover:translate-x-1" />
      </button>
    </article>
  )
}

export default ResourceCard

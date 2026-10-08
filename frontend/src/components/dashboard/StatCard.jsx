function StatCard({ label, value, description, icon: Icon }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-700">{label}</h3>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xl text-brand">
          <Icon aria-hidden="true" />
        </span>
      </div>
      {/* Long text values (e.g. a course name) use a smaller size than numbers */}
      <p
        className={`mt-3 font-extrabold text-ink ${value.length > 6 ? 'text-xl sm:text-2xl' : 'text-4xl'}`}
      >
        {value}
      </p>
      <p className="mt-auto pt-2 text-sm text-gray-500">{description}</p>
    </article>
  )
}

export function StatCardGrid({ stats }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
      {stats.map((stat) => (
        <li key={stat.label}>
          <StatCard {...stat} />
        </li>
      ))}
    </ul>
  )
}

export default StatCard

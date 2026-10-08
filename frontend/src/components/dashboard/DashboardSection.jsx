// White card wrapper with an icon + title header, used for every dashboard section
function DashboardSection({ title, icon: Icon, aside, className = '', children }) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-bold text-ink sm:text-xl">
          {Icon && <Icon aria-hidden="true" className="text-brand" />}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export default DashboardSection

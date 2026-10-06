// Highlighted panel used for payment information
function InfoCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-brand/20 border-l-4 border-l-brand bg-brand-soft p-5">
      <h3 className="mb-3 flex items-center gap-2 font-bold text-ink">
        <Icon className="text-brand" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </div>
  )
}

export default InfoCard

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold tracking-widest text-brand uppercase">{eyebrow}</p>
      )}
      <h2 className="text-3xl font-bold text-ink sm:text-4xl">{title}</h2>
      <span className="mx-auto mt-4 block h-1 w-16 rounded-full bg-brand" aria-hidden="true" />
      {subtitle && <p className="mt-4 text-base text-gray-600">{subtitle}</p>}
    </div>
  )
}

export default SectionHeading

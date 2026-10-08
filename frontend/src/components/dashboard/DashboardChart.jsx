// Simple visual summary without a chart library: a stacked bar plus one row per item.
// `data` is [{ label, value, color }] where `color` is a Tailwind background class.
function DashboardChart({ data, totalLabel = 'Total' }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const percent = (value) => (total ? (value / total) * 100 : 0)

  return (
    <div>
      <p className="text-4xl font-extrabold text-ink">{total}</p>
      <p className="text-sm text-gray-500">{totalLabel}</p>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
        {data.map(({ label, value, color }) => (
          <span key={label} className={color} style={{ width: `${percent(value)}%` }} />
        ))}
      </div>

      <ul className="mt-6 flex flex-col gap-4">
        {data.map(({ label, value, color }) => (
          <li key={label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-gray-700">
                <span className={`h-3 w-3 rounded-full ${color}`} aria-hidden="true" />
                {label}
              </span>
              <span className="font-semibold text-ink">
                {value}{' '}
                <span className="font-normal text-gray-500">({Math.round(percent(value))}%)</span>
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${percent(value)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default DashboardChart

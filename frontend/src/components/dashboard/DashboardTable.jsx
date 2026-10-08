// Generic table. `columns` is [{ key, label, render? }]; `render(row)` customises a cell.
// Scrolls horizontally inside its own box on small screens instead of widening the page.
function DashboardTable({ columns, rows, caption }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full min-w-[32rem] text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-gray-50 text-xs tracking-wide text-gray-600 uppercase">
          <tr>
            {columns.map(({ key, label }) => (
              <th key={key} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id} className="transition hover:bg-brand-soft/40">
              {columns.map(({ key, render }, index) => (
                <td
                  key={key}
                  className={`px-4 py-3 whitespace-nowrap ${index === 0 ? 'font-semibold text-ink' : 'text-gray-700'}`}
                >
                  {render ? render(row) : row[key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DashboardTable

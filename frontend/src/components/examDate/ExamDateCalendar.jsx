import { useState } from 'react'
import { FaChevronLeft, FaChevronRight, FaCircleInfo } from 'react-icons/fa6'
import {
  CALENDAR_MONTHS_AHEAD,
  EXAM_WEEKDAYS,
  addMonths,
  formatExamDate,
  formatExamWeekdays,
  formatMonth,
  getDayNumber,
  getMonthKey,
  getMonthWeeks,
  getNextExamDate,
  isSelectableDate,
} from '../../utils/examDateUtils'

// Column headings, Monday first, with the getUTCDay() number of each column
const COLUMNS = EXAM_WEEKDAYS.map(({ value, name }) => ({ value, label: name.slice(0, 3) }))

const navButton =
  'flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white p-2.5 text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-ink'

// Month calendar on which only dates after `today` that fall on one of `weekdays` (the
// examination days the admin offers, 1 = Monday ... 5 = Friday) can be chosen. `selected`
// is the list of chosen 'YYYY-MM-DD' dates in the order they were chosen; `onToggle(date)`
// adds or removes one. Once `max` dates are chosen, the others cannot be added until one
// is removed.
function ExamDateCalendar({ today, weekdays, selected, max, onToggle, disabled = false }) {
  const firstMonth = getMonthKey(today)
  const lastMonth = addMonths(firstMonth, CALENDAR_MONTHS_AHEAD)
  // Opens on the month of the next date that can be chosen
  const [month, setMonth] = useState(() => getMonthKey(getNextExamDate(today, weekdays)))
  const full = selected.length >= max
  const weeks = getMonthWeeks(month)
  const monthHasDates = weeks.some((week) => week.some((date) => date && isSelectableDate(date, today, weekdays)))

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          disabled={month <= firstMonth}
          aria-label="Previous month"
          className={navButton}
        >
          <FaChevronLeft aria-hidden="true" />
        </button>
        <p className="text-lg font-bold text-ink" aria-live="polite">
          {formatMonth(month)}
        </p>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={month >= lastMonth}
          aria-label="Next month"
          className={navButton}
        >
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>

      <table className="w-full table-fixed border-separate border-spacing-1 text-center">
        <caption className="sr-only">
          {formatMonth(month)}: choose from the {formatExamWeekdays(weekdays)} that are not disabled
        </caption>
        <thead>
          <tr>
            {COLUMNS.map(({ value, label }) => (
              <th
                key={value}
                scope="col"
                className={`pb-1 text-xs font-semibold uppercase ${weekdays.includes(value) ? 'text-brand' : 'text-gray-500'}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.find(Boolean)}>
              {week.map((date, column) => {
                // Empty cells before the 1st and after the last day of the month
                if (!date) return <td key={`empty-${column}`} />
                const isSelected = selected.includes(date)
                const selectable = isSelectableDate(date, today, weekdays)
                const unavailable = disabled || !selectable || (full && !isSelected)
                return (
                  <td key={date}>
                    <button
                      type="button"
                      onClick={() => onToggle(date)}
                      disabled={unavailable}
                      aria-pressed={selectable ? isSelected : undefined}
                      aria-label={formatExamDate(date)}
                      data-date={date}
                      className={`flex aspect-square w-full items-center justify-center rounded-lg text-sm font-semibold transition ${
                        isSelected
                          ? 'cursor-pointer bg-brand text-white shadow-md shadow-brand/30'
                          : !selectable
                            ? 'cursor-not-allowed text-gray-300'
                            : unavailable
                              ? 'cursor-not-allowed border-2 border-gray-200 text-gray-400'
                              : 'cursor-pointer border-2 border-brand/40 bg-brand-soft text-brand-dark hover:border-brand hover:bg-brand hover:text-white'
                      }`}
                    >
                      {getDayNumber(date)}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {!monthHasDates && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <FaCircleInfo aria-hidden="true" className="mt-0.5 shrink-0" />
          There are no examination dates available in {formatMonth(month)}. Please choose another month.
        </p>
      )}

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border-2 border-brand/40 bg-brand-soft" aria-hidden="true" />
          Available date
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-brand" aria-hidden="true" />
          Selected
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-gray-200" aria-hidden="true" />
          Not available
        </li>
      </ul>
    </div>
  )
}

export default ExamDateCalendar

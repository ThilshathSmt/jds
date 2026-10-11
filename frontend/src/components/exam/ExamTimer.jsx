import { FaClock } from 'react-icons/fa6'
import { formatDuration } from '../../utils/formatUtils'

const FIVE_MINUTES = 5 * 60
const ONE_MINUTE = 60

const styles = {
  normal: 'border-gray-200 bg-white text-ink',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  critical: 'border-brand bg-brand text-white',
}

// The time left in HH:MM:SS. Turns amber for the last five minutes and red for the last
// one. `secondsLeft` comes from useCountdown, which follows the backend's deadline.
function ExamTimer({ secondsLeft, text }) {
  const level =
    secondsLeft <= ONE_MINUTE ? 'critical' : secondsLeft <= FIVE_MINUTES ? 'warning' : 'normal'
  const warning =
    secondsLeft <= 0
      ? text.timeUp
      : level === 'critical'
        ? text.oneMinuteLeft
        : level === 'warning'
          ? text.fiveMinutesLeft
          : ''

  return (
    <div
      data-level={level}
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border-2 px-4 py-3 shadow-md transition-colors ${styles[level]}`}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <FaClock aria-hidden="true" className={level === 'critical' ? 'animate-pulse' : ''} />
        {text.timeRemaining}
      </p>
      <p role="timer" aria-label={text.timeRemaining} className="font-mono text-2xl font-bold tabular-nums sm:text-3xl">
        {formatDuration(secondsLeft)}
      </p>
      {/* Read out once when it changes: at five minutes, at one minute and at zero */}
      <p role="status" aria-live="assertive" className={warning ? 'w-full text-sm font-semibold' : 'sr-only'}>
        {warning}
      </p>
    </div>
  )
}

export default ExamTimer

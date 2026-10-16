import { useState } from 'react'
import { FaCheck, FaClock } from 'react-icons/fa6'
import Modal from '../admin/Modal'
import { formatTime, getTimeSlots } from '../../utils/practicalUtils'

// A lesson time field. Opens a picker with only the allowed slots (7:00 AM to 7:00 PM every
// 15 minutes, from `rules`); the chosen time is put in the field only with OK. Cancel or
// closing leaves the field as it was. It never saves anything itself: `onChange(time)` only
// updates the form, which is saved with the lesson's own Save button.
function TimeSlotPicker({ id, value, rules, disabled, invalid, onChange }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(null)
  const slots = getTimeSlots(rules)

  const openPicker = () => {
    // Start from the current value only when it is an allowed slot
    setPending(slots.includes(value) ? value : null)
    setOpen(true)
  }
  const confirm = () => {
    if (pending) onChange(pending)
    setOpen(false)
  }

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-invalid={invalid ? true : undefined}
        className={`form-input !py-1.5 flex w-36 cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed ${invalid ? 'form-input-error' : ''}`}
      >
        <span className={value ? 'text-ink' : 'text-gray-400'}>{value ? formatTime(value) : 'Select time'}</span>
        <FaClock aria-hidden="true" className="shrink-0 text-gray-500" />
      </button>

      {open && (
        <Modal title="Select Lesson Time" icon={FaClock} onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-gray-600">
            Lessons start between {formatTime(rules.timeFirst)} and {formatTime(rules.timeLast)}, every{' '}
            {rules.stepMinutes} minutes.
          </p>
          <div role="radiogroup" aria-label="Lesson time" className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
            {slots.map((slot) => {
              const selected = pending === slot
              return (
                <button
                  key={slot}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-slot={slot}
                  onClick={() => setPending(slot)}
                  className={`cursor-pointer rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                    selected ? 'border-brand bg-brand text-white' : 'border-gray-200 bg-white text-ink hover:border-brand hover:text-brand'
                  }`}
                >
                  {formatTime(slot)}
                </button>
              )
            })}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-sm text-gray-600">{pending ? `Selected: ${formatTime(pending)}` : 'No time selected'}</span>
            <div className="flex gap-3">
              <button type="button" onClick={() => setOpen(false)} className="btn !rounded-lg bg-gray-200 !px-5 !py-2 text-ink hover:bg-gray-300">
                Cancel
              </button>
              <button type="button" onClick={confirm} disabled={!pending} className="btn btn-primary !rounded-lg !px-5 !py-2 disabled:cursor-not-allowed disabled:opacity-60">
                <FaCheck aria-hidden="true" />
                OK
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

export default TimeSlotPicker

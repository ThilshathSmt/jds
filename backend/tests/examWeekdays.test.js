// Rules of the admin-controlled examination days, without a database: the stored bitmask,
// the request validation and the check against the saved days.
// Run with: npm test

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  DEFAULT_EXAM_WEEKDAYS,
  examWeekdaysToMask,
  formatExamWeekdays,
  maskToExamWeekdays,
} from '../config/licenceExam.js'
import {
  validateExamDateRequestInput,
  validateExamDatesForWeekdays,
  validateExamWeekdaysInput,
} from '../utils/validationUtils.js'

// Sunday 18 October 2026, midday in Sri Lanka
const NOW = new Date('2026-10-18T06:30:00Z')
const MON = '2026-10-19'
const TUE = '2026-10-20'
const WED = '2026-10-21'
const THU = '2026-10-22'
const FRI = '2026-10-23'
const SAT = '2026-10-24'
const SUN = '2026-10-25'
const PAST_TUE = '2026-10-13'

const request = (preferredDates, medicalReportSubmitted = true) =>
  validateExamDateRequestInput({ medicalReportSubmitted, preferredDates }, NOW)

// Asserts a 400 AppError whose field error is on `field`
const rejects400 = (run, field) =>
  assert.throws(run, (error) => error.statusCode === 400 && Boolean(error.errors?.[field]))

describe('stored setting (bitmask)', () => {
  test('round-trips any choice of Monday to Friday', () => {
    for (const weekdays of [[2], [2, 5], [1, 3, 5], [1, 2, 3, 4, 5]]) {
      assert.deepEqual(maskToExamWeekdays(examWeekdaysToMask(weekdays)), weekdays)
    }
  })

  test('Tuesday only is stored as 4, the value the schema starts with', () => {
    assert.equal(examWeekdaysToMask([2]), 4)
    assert.deepEqual(DEFAULT_EXAM_WEEKDAYS, [2])
  })

  test('a missing or empty setting means Tuesdays only', () => {
    assert.deepEqual(maskToExamWeekdays(0), [2])
  })

  test('Saturday and Sunday bits are ignored', () => {
    assert.deepEqual(maskToExamWeekdays((1 << 0) | (1 << 6) | (1 << 5)), [5])
    assert.deepEqual(maskToExamWeekdays((1 << 0) | (1 << 6)), [2])
  })

  test('names the days for messages', () => {
    assert.equal(formatExamWeekdays([2]), 'Tuesday')
    assert.equal(formatExamWeekdays([2, 5]), 'Tuesday or Friday')
    assert.equal(formatExamWeekdays([1, 3, 5]), 'Monday, Wednesday or Friday')
  })
})

describe('admin input: validateExamWeekdaysInput', () => {
  test('accepts one or more weekdays, sorted without repeats', () => {
    assert.deepEqual(validateExamWeekdaysInput({ weekdays: [2] }), { weekdays: [2] })
    assert.deepEqual(validateExamWeekdaysInput({ weekdays: [5, 2, 5] }), { weekdays: [2, 5] })
    assert.deepEqual(validateExamWeekdaysInput({ weekdays: [5, 3, 1] }), { weekdays: [1, 3, 5] })
  })

  test('refuses Saturday and Sunday', () => {
    rejects400(() => validateExamWeekdaysInput({ weekdays: [2, 6] }), 'weekdays')
    rejects400(() => validateExamWeekdaysInput({ weekdays: [0] }), 'weekdays')
  })

  test('refuses no days, non-integers and anything that is not a list', () => {
    rejects400(() => validateExamWeekdaysInput({ weekdays: [] }), 'weekdays')
    rejects400(() => validateExamWeekdaysInput({}), 'weekdays')
    rejects400(() => validateExamWeekdaysInput({ weekdays: '2' }), 'weekdays')
    rejects400(() => validateExamWeekdaysInput({ weekdays: ['2'] }), 'weekdays')
    rejects400(() => validateExamWeekdaysInput({ weekdays: [2.5] }), 'weekdays')
    rejects400(() => validateExamWeekdaysInput({ weekdays: [7] }), 'weekdays')
  })
})

describe('student request: validateExamDateRequestInput', () => {
  test('accepts future weekdays in the order given', () => {
    assert.deepEqual(request([FRI, TUE, MON]).preferredDates, [FRI, TUE, MON])
  })

  test('requires the medical report confirmation', () => {
    rejects400(() => request([TUE], false), 'medicalReportSubmitted')
    rejects400(() => validateExamDateRequestInput({ preferredDates: [TUE] }, NOW), 'medicalReportSubmitted')
  })

  test('refuses Saturday and Sunday whatever the admin setting', () => {
    rejects400(() => request([SAT]), 'preferredDates')
    rejects400(() => request([TUE, SUN]), 'preferredDates')
  })

  test('refuses past dates and today', () => {
    rejects400(() => request([PAST_TUE]), 'preferredDates')
    rejects400(() => request(['2026-10-18']), 'preferredDates')
  })

  test('refuses more than three dates, none, repeats and invalid dates', () => {
    rejects400(() => request([MON, TUE, WED, THU]), 'preferredDates')
    rejects400(() => request([]), 'preferredDates')
    rejects400(() => request([TUE, TUE]), 'preferredDates')
    rejects400(() => request(['2026-02-30']), 'preferredDates')
  })
})

describe('check against the saved days: validateExamDatesForWeekdays', () => {
  test('Tuesday only: Tuesdays pass, other weekdays are refused', () => {
    assert.doesNotThrow(() => validateExamDatesForWeekdays([TUE], [2]))
    rejects400(() => validateExamDatesForWeekdays([FRI], [2]), 'preferredDates')
    rejects400(() => validateExamDatesForWeekdays([TUE, WED], [2]), 'preferredDates')
  })

  test('Tuesday and Friday: both pass', () => {
    assert.doesNotThrow(() => validateExamDatesForWeekdays([TUE, FRI], [2, 5]))
    rejects400(() => validateExamDatesForWeekdays([MON], [2, 5]), 'preferredDates')
  })

  test('Monday, Wednesday and Friday: only those pass; Tuesday is refused once disabled', () => {
    assert.doesNotThrow(() => validateExamDatesForWeekdays([MON, WED, FRI], [1, 3, 5]))
    rejects400(() => validateExamDatesForWeekdays([TUE], [1, 3, 5]), 'preferredDates')
    rejects400(() => validateExamDatesForWeekdays([THU], [1, 3, 5]), 'preferredDates')
  })

  test('the message names the days on offer', () => {
    assert.throws(
      () => validateExamDatesForWeekdays([TUE], [1, 3, 5]),
      /Monday, Wednesday or Friday only/,
    )
  })
})

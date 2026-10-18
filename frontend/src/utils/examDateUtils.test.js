// Which dates the student's exam date calendar offers for the examination days the admin
// has chosen. Run with: npm test

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { formatExamWeekdays, getMonthWeeks, getNextExamDate, isSelectableDate } from './examDateUtils.js'

// Sunday 18 October 2026
const TODAY = '2026-10-18'
const selectableIn = (monthKey, weekdays) =>
  getMonthWeeks(monthKey)
    .flat()
    .filter((date) => date && isSelectableDate(date, TODAY, weekdays))

describe('isSelectableDate', () => {
  test('Tuesday only: the remaining Tuesdays of the month', () => {
    assert.deepEqual(selectableIn('2026-10', [2]), ['2026-10-20', '2026-10-27'])
  })

  test('Tuesday and Friday: both days', () => {
    assert.deepEqual(selectableIn('2026-10', [2, 5]), ['2026-10-20', '2026-10-23', '2026-10-27', '2026-10-30'])
  })

  test('Monday, Wednesday and Friday: only those days', () => {
    assert.deepEqual(selectableIn('2026-10', [1, 3, 5]), [
      '2026-10-19',
      '2026-10-21',
      '2026-10-23',
      '2026-10-26',
      '2026-10-28',
      '2026-10-30',
    ])
  })

  test('Saturday and Sunday are never offered, even if sent as weekdays', () => {
    assert.equal(isSelectableDate('2026-10-24', TODAY, [0, 2, 6]), false)
    assert.equal(isSelectableDate('2026-10-25', TODAY, [0, 2, 6]), false)
  })

  test('past dates and today are never offered', () => {
    assert.equal(isSelectableDate('2026-10-13', TODAY, [2]), false)
    assert.equal(isSelectableDate('2026-10-16', '2026-10-16', [5]), false)
    assert.deepEqual(selectableIn('2026-09', [1, 2, 3, 4, 5]), [])
  })
})

describe('getNextExamDate', () => {
  test('is the first offered date after today', () => {
    assert.equal(getNextExamDate(TODAY, [2]), '2026-10-20')
    assert.equal(getNextExamDate(TODAY, [5]), '2026-10-23')
    assert.equal(getNextExamDate('2026-10-20', [2]), '2026-10-27')
  })

  test('moves to the next month when this one has no offered date left', () => {
    assert.equal(getNextExamDate('2026-10-30', [2]), '2026-11-03')
  })
})

test('formatExamWeekdays names the days in order', () => {
  assert.equal(formatExamWeekdays([2]), 'Tuesdays')
  assert.equal(formatExamWeekdays([5, 2]), 'Tuesdays and Fridays')
  assert.equal(formatExamWeekdays([1, 3, 5]), 'Mondays, Wednesdays and Fridays')
})

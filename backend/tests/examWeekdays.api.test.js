// The Driving Exam setting through the HTTP API, against the database configured in .env.
// Needs `npm run db:setup` to have been run, an admin account and a student account. The
// saved examination days are restored when the tests end; no request is created (every
// submission below is one the server must refuse). Skipped when the database is unreachable.
// Run with: npm test

import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import app from '../app.js'
import pool, { testConnection } from '../config/database.js'
import { EXAM_WEEKDAYS_KEY } from '../services/settingsService.js'
import { addDays, getSchoolDate, getWeekday } from '../utils/dateUtils.js'
import { SESSION_COOKIE, createSession } from '../utils/sessionUtils.js'

const databaseReady = await testConnection().then(
  () => true,
  () => false,
)

// The first date after today (in Sri Lanka) that falls on `weekday`, at least `skip` weeks on
const nextDate = (weekday, skip = 0) => {
  let date = addDays(getSchoolDate(), 1)
  while (getWeekday(date) !== weekday) date = addDays(date, 1)
  return addDays(date, skip * 7)
}

const cookieFor = (user) => `${SESSION_COOKIE}=${createSession(user.id, user.session_version).token}`

const findUser = async (role) => {
  const [rows] = await pool.execute(
    `SELECT id, session_version FROM users
      WHERE role = ? AND status = 'active' AND locked_at IS NULL ORDER BY id LIMIT 1`,
    [role],
  )
  return rows[0] ?? null
}

// Every request's decision, to show that a change of the setting leaves them untouched
const snapshotRequests = async () => {
  const [rows] = await pool.execute(
    `SELECT id, status, DATE_FORMAT(approved_date, '%Y-%m-%d') AS approved_date
       FROM exam_date_requests ORDER BY id`,
  )
  return rows
}

describe('Driving Exam API', { skip: !databaseReady && 'database is not reachable' }, () => {
  let server
  let baseUrl
  let admin
  let student
  let originalSetting

  const call = async (method, path, { cookie, body } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return { status: response.status, body: await response.json() }
  }
  const countRequests = async () => {
    const [rows] = await pool.execute('SELECT COUNT(*) AS n FROM exam_date_requests')
    return Number(rows[0].n)
  }
  const findEligibleStudent = async () => {
    const [students] = await pool.execute(
      `SELECT id, session_version FROM users WHERE role = 'student' AND status = 'active' AND locked_at IS NULL`,
    )
    for (const candidate of students) {
      const list = await call('GET', '/api/student/exam-date-requests', { cookie: cookieFor(candidate) })
      if (list.body.data?.canSubmit) return candidate
    }
    return null
  }
  const saveDays = (weekdays) => call('PUT', '/api/admin/exam-weekdays', { cookie: cookieFor(admin), body: { weekdays } })

  before(async () => {
    admin = await findUser('admin')
    student = await findUser('student')
    const [rows] = await pool.execute('SELECT setting_value FROM system_settings WHERE setting_key = ?', [
      EXAM_WEEKDAYS_KEY,
    ])
    originalSetting = rows[0]?.setting_value ?? null
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve)
    })
    baseUrl = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    if (originalSetting === null) {
      await pool.execute('DELETE FROM system_settings WHERE setting_key = ?', [EXAM_WEEKDAYS_KEY])
    } else {
      await pool.execute('UPDATE system_settings SET setting_value = ? WHERE setting_key = ?', [
        originalSetting,
        EXAM_WEEKDAYS_KEY,
      ])
    }
    await new Promise((resolve) => server.close(resolve))
    await pool.end()
  })

  test('the schema seeds Tuesday only when no configuration exists', () => {
    assert.notEqual(originalSetting, null, 'run npm run db:setup first')
  })

  test('only administrators can read or change the days', async (t) => {
    assert.equal((await call('GET', '/api/admin/exam-weekdays')).status, 401)
    assert.equal((await call('PUT', '/api/admin/exam-weekdays', { body: { weekdays: [5] } })).status, 401)
    if (!student) return t.skip('no student account')
    const asStudent = { cookie: cookieFor(student), body: { weekdays: [1, 2, 3, 4, 5] } }
    assert.equal((await call('PUT', '/api/admin/exam-weekdays', asStudent)).status, 403)
    assert.equal((await call('GET', '/api/admin/exam-weekdays', { cookie: asStudent.cookie })).status, 403)
  })

  test('an admin saves the days and they are read back from the database', async (t) => {
    if (!admin) return t.skip('no admin account')
    for (const weekdays of [[2], [2, 5], [1, 3, 5]]) {
      const saved = await saveDays(weekdays)
      assert.equal(saved.status, 200)
      assert.deepEqual(saved.body.data.weekdays, weekdays)
      const loaded = await call('GET', '/api/admin/exam-weekdays', { cookie: cookieFor(admin) })
      assert.deepEqual(loaded.body.data.weekdays, weekdays)
    }
    // One row, however often it is saved
    const [rows] = await pool.execute('SELECT COUNT(*) AS n FROM system_settings WHERE setting_key = ?', [
      EXAM_WEEKDAYS_KEY,
    ])
    assert.equal(Number(rows[0].n), 1)
  })

  test('Saturday, Sunday and an empty choice are refused and change nothing', async (t) => {
    if (!admin) return t.skip('no admin account')
    await saveDays([2, 5])
    for (const weekdays of [[6], [0], [2, 6], [], 'Tuesday']) {
      const response = await saveDays(weekdays)
      assert.equal(response.status, 400, JSON.stringify(weekdays))
      assert.ok(response.body.errors.weekdays)
    }
    const loaded = await call('GET', '/api/admin/exam-weekdays', { cookie: cookieFor(admin) })
    assert.deepEqual(loaded.body.data.weekdays, [2, 5])
  })

  test('the student form receives the current days', async (t) => {
    if (!admin || !student) return t.skip('needs an admin and a student account')
    await saveDays([1, 3, 5])
    const list = await call('GET', '/api/student/exam-date-requests', { cookie: cookieFor(student) })
    assert.equal(list.status, 200)
    assert.deepEqual(list.body.data.examWeekdays, [1, 3, 5])
  })

  test('changing the days leaves saved requests and approved dates as they are', async (t) => {
    if (!admin) return t.skip('no admin account')
    const before = await snapshotRequests()
    await saveDays([4])
    await saveDays([2])
    assert.deepEqual(await snapshotRequests(), before)
  })

  test('a student cannot get around the calendar by calling the API', async (t) => {
    if (!admin || !student) return t.skip('needs an admin and a student account')
    const cookie = cookieFor(student)
    const submit = (preferredDates, medicalReportSubmitted = true) =>
      call('POST', '/api/student/exam-date-requests', { cookie, body: { medicalReportSubmitted, preferredDates } })
    const countBefore = await countRequests()

    // Refused before anything is read from the database, whatever the student's situation
    const pastTuesday = addDays(nextDate(2), -7)
    const refusals = [
      { dates: [nextDate(6)], why: 'Saturday' },
      { dates: [nextDate(0)], why: 'Sunday' },
      { dates: [pastTuesday], why: 'a past date' },
      { dates: [nextDate(2), nextDate(2, 1), nextDate(2, 2), nextDate(2, 3)], why: 'four dates' },
    ]
    for (const { dates, why } of refusals) {
      const response = await submit(dates)
      assert.equal(response.status, 400, why)
      assert.ok(response.body.errors.preferredDates, why)
    }
    const noMedical = await submit([nextDate(2)], false)
    assert.equal(noMedical.status, 400)
    assert.ok(noMedical.body.errors.medicalReportSubmitted)

    // A weekday the admin has not enabled: checked against the saved days when the request
    // is saved, so it only shows when the student may request a date at the moment
    // (any active student who may request a date now; refused, so nothing is saved for them)
    await saveDays([2])
    const eligible = await findEligibleStudent()
    if (eligible) {
      const submitAs = (preferredDates) =>
        call('POST', '/api/student/exam-date-requests', {
          cookie: cookieFor(eligible),
          body: { medicalReportSubmitted: true, preferredDates },
        })
      const friday = await submitAs([nextDate(5)])
      assert.equal(friday.status, 400)
      assert.match(friday.body.errors.preferredDates, /Tuesday only/)
      await saveDays([1, 3, 5])
      const tuesday = await submitAs([nextDate(2)])
      assert.equal(tuesday.status, 400)
      assert.match(tuesday.body.errors.preferredDates, /Monday, Wednesday or Friday only/)
    } else {
      t.diagnostic('no student may request a date now: the disabled-weekday check was not reached')
    }

    assert.equal(await countRequests(), countBefore, 'no request may have been saved')
  })
})

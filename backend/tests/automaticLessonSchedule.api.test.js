import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import pool from '../config/database.js'
import { getProvisionalTestDate } from '../services/practicalService.js'
import { addDays, getSchoolDate } from '../utils/dateUtils.js'
import { createApiTestKit, isDatabaseReachable } from './helpers/apiTestKit.js'

const databaseReady = await isDatabaseReachable()
const kit = createApiTestKit()

describe('Automatic lesson schedule API', { skip: !databaseReady && 'database is not reachable' }, () => {
  let admin, student, instructor, cycleId
  before(async () => {
    await kit.start()
    admin = await kit.createSignedInUser('auto-schedule-admin', 'admin')
    student = await kit.createSignedInUser('auto-schedule-student', 'student')
    instructor = await kit.createSignedInUser('auto-schedule-instructor', 'instructor')
    const examDate = addDays(getSchoolDate(), -1)
    const [cycle] = await pool.execute(`INSERT INTO practical_cycles
      (user_id, cycle_number, exam_date, provisional_test_date) VALUES (?, 1, ?, ?)`,
    [student.id, examDate, getProvisionalTestDate(examDate)])
    cycleId = cycle.insertId
  })
  after(async () => kit.cleanUp())

  test('is admin-only, proposes ten valid unsaved lessons, and refuses replacement after a save', async () => {
    const path = `/api/admin/practical/cycles/${cycleId}/lessons/automatic-proposal`
    assert.equal((await kit.call('POST', path, { cookie: student.cookie })).status, 403)
    const response = await kit.call('POST', path, { cookie: admin.cookie })
    assert.equal(response.status, 200)
    const { targetDate, earliestDate, latestDate, lessons } = response.body.data
    assert.equal(lessons.length, 10)
    assert.equal(new Set(lessons.map(({ date }) => date)).size, 10)
    assert.ok(lessons.every(({ date }) => date >= earliestDate && date <= latestDate && date < targetDate))
    assert.ok(lessons.every(({ instructorId }) => instructorId === null))

    // Repeated generation only creates another proposal; it never inserts lesson records.
    assert.equal((await kit.call('POST', path, { cookie: admin.cookie })).status, 200)
    const unsaved = await kit.call('GET', `/api/admin/practical/cycles/${cycleId}`, { cookie: admin.cookie })
    assert.ok(unsaved.body.data.cycle.lessons.every(({ date, instructor }) => date === null && instructor === null))

    await pool.execute('INSERT INTO practical_cycle_instructors (cycle_id, instructor_id, assigned_by) VALUES (?, ?, ?)', [cycleId, instructor.id, admin.id])
    const first = lessons[0]
    const saved = await kit.call('PUT', `/api/admin/practical/cycles/${cycleId}/lessons/1`, {
      cookie: admin.cookie,
      body: { instructorId: instructor.id, date: first.date, time: first.time, location: first.location },
    })
    assert.equal(saved.status, 200)
    assert.equal(saved.body.data.cycle.lessons[0].attendance, 'PENDING')

    const studentConflict = await kit.call('PUT', `/api/admin/practical/cycles/${cycleId}/lessons/2`, {
      cookie: admin.cookie,
      body: { instructorId: instructor.id, date: first.date, time: first.time, location: first.location },
    })
    assert.equal(studentConflict.status, 409)
    assert.match(studentConflict.body.message, /student already has another lesson/)

    const otherStudent = await kit.createSignedInUser('auto-schedule-other-student', 'student')
    const [otherCycle] = await pool.execute('INSERT INTO practical_cycles (user_id, cycle_number) VALUES (?, 1)', [otherStudent.id])
    await pool.execute('INSERT INTO practical_cycle_instructors (cycle_id, instructor_id, assigned_by) VALUES (?, ?, ?)', [otherCycle.insertId, instructor.id, admin.id])
    const instructorConflict = await kit.call('PUT', `/api/admin/practical/cycles/${otherCycle.insertId}/lessons/1`, {
      cookie: admin.cookie,
      body: { instructorId: instructor.id, date: first.date, time: first.time, location: first.location },
    })
    assert.equal(instructorConflict.status, 409)
    assert.match(instructorConflict.body.message, /instructor already has another lesson/)

    const replacement = await kit.call('POST', path, { cookie: admin.cookie })
    assert.equal(replacement.status, 409)
    assert.match(replacement.body.message, /saved lesson details/)
    const after = await kit.call('GET', `/api/admin/practical/cycles/${cycleId}`, { cookie: admin.cookie })
    assert.equal(after.body.data.cycle.lessons.filter(({ date }) => date).length, 1)
  })
})

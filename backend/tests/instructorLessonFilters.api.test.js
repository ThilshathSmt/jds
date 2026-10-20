import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import pool from '../config/database.js'
import { createApiTestKit, isDatabaseReachable } from './helpers/apiTestKit.js'

const databaseReady = await isDatabaseReachable()
const kit = createApiTestKit()

describe('Instructor lesson filters API', { skip: !databaseReady && 'database is not reachable' }, () => {
  let instructor, otherInstructor, student, otherStudent, passedStudent, failedStudent
  const path = '/api/instructor/lessons'

  before(async () => {
    await kit.start()
    instructor = await kit.createSignedInUser('filter-instructor', 'instructor')
    otherInstructor = await kit.createSignedInUser('filter-other-instructor', 'instructor')
    student = await kit.createSignedInUser('filter-student', 'student')
    otherStudent = await kit.createSignedInUser('filter-other-student', 'student')
    passedStudent = await kit.createSignedInUser('filter-passed-student', 'student')
    failedStudent = await kit.createSignedInUser('filter-failed-student', 'student')
    const [[cycle], [otherCycle]] = await Promise.all([
      pool.execute('INSERT INTO practical_cycles (user_id, cycle_number) VALUES (?, 1)', [student.id]),
      pool.execute('INSERT INTO practical_cycles (user_id, cycle_number) VALUES (?, 1)', [otherStudent.id]),
    ])
    await pool.execute(`INSERT INTO practical_lessons (cycle_id, lesson_number, instructor_id, lesson_date, start_time, location, attendance)
      VALUES (?, 1, ?, '2030-01-10', '09:00:00', 'Sammanthurai', 'PENDING'),
             (?, 2, ?, '2030-01-10', '10:00:00', 'Walathapity', 'ATTENDED'),
             (?, 3, ?, '2030-01-11', '11:00:00', 'Sammanthurai', 'ABSENT')`,
    [cycle.insertId, instructor.id, cycle.insertId, instructor.id, otherCycle.insertId, otherInstructor.id])

    const recordDrivingSchoolResult = async (account, result) => {
      const [request] = await pool.execute(`INSERT INTO exam_date_requests
        (user_id, student_name, driving_school_id, medical_report_submitted, status, pending, approved_date)
        SELECT id, name, driving_school_id, 1, 'APPROVED', NULL, '2030-01-01' FROM users WHERE id = ?`, [account.id])
      const [attemptCycle] = await pool.execute(
        'INSERT INTO exam_attempt_cycles (user_id, cycle_number, status) VALUES (?, 1, ?)',
        [account.id, result === 'PASSED' ? 'PASSED' : 'ACTIVE'],
      )
      const [attempt] = await pool.execute(`INSERT INTO licence_exam_attempts
        (user_id, cycle_id, attempt_number, exam_date_request_id, exam_date, result, recorded_at)
        VALUES (?, ?, 1, ?, '2030-01-01', ?, NOW())`,
      [account.id, attemptCycle.insertId, request.insertId, result])
      return attempt.insertId
    }
    const passedAttemptId = await recordDrivingSchoolResult(passedStudent, 'PASSED')
    await recordDrivingSchoolResult(failedStudent, 'FAILED')
    const [passedCycle] = await pool.execute(
      'INSERT INTO practical_cycles (user_id, cycle_number, source_attempt_id, exam_date) VALUES (?, 1, ?, ?) ',
      [passedStudent.id, passedAttemptId, '2030-01-01'],
    )
    const [failedCycle] = await pool.execute('INSERT INTO practical_cycles (user_id, cycle_number) VALUES (?, 1)', [failedStudent.id])
    await pool.execute(`INSERT INTO practical_lessons (cycle_id, lesson_number, instructor_id, lesson_date, start_time, location)
      VALUES (?, 1, ?, '2030-01-12', '09:00:00', 'Sammanthurai'),
             (?, 1, ?, '2030-01-13', '09:00:00', 'Sammanthurai')`,
    [passedCycle.insertId, instructor.id, failedCycle.insertId, instructor.id])
  })
  after(async () => kit.cleanUp())

  const get = (query = '', cookie = instructor.cookie) => kit.call('GET', `${path}${query}`, { cookie })

  test('filters by complete and partial Driving School ID and partial name', async () => {
    const fullId = await get(`?studentId=${student.drivingSchoolId}`)
    assert.equal(fullId.status, 200)
    assert.equal(fullId.body.data.lessons.length, 2)
    assert.ok(fullId.body.data.lessons.every(({ student: row }) => row.drivingSchoolId === student.drivingSchoolId))

    const partialId = await get('?studentId=filter-student')
    assert.equal(partialId.body.data.lessons.length, 2)
    const partialName = await get('?studentName=Test%20filter-student')
    assert.equal(partialName.body.data.lessons.length, 2)
  })

  test('combines date and attendance filters with AND; filtering is read-only', async () => {
    const response = await get('?date=2030-01-10&attendanceStatus=pending')
    assert.equal(response.status, 200)
    assert.equal(response.body.data.lessons.length, 1)
    assert.equal(response.body.data.lessons[0].attendance, 'PENDING')
    assert.equal(response.body.data.totalAssigned, 4)
    const [[row]] = await pool.execute(`SELECT l.attendance FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
      WHERE l.instructor_id = ? AND l.lesson_number = 1 AND c.user_id = ?`, [instructor.id, student.id])
    assert.equal(row.attendance, 'PENDING')
  })

  test('does not disclose another instructor lessons and rejects invalid filters', async () => {
    const attempted = await get(`?studentId=${otherStudent.drivingSchoolId}`)
    assert.equal(attempted.status, 200)
    assert.equal(attempted.body.data.lessons.length, 0)
    assert.equal((await get('?attendanceStatus=COMPLETED')).status, 400)
    assert.equal((await get('?date=2030-99-99')).status, 400)
    assert.equal((await kit.call('GET', path, { cookie: student.cookie })).status, 403)
  })

  test('eligible ID options require a passed driving school exam and lessons assigned to this instructor', async () => {
    const response = await kit.call('GET', '/api/instructor/eligible-students', { cookie: instructor.cookie })
    assert.equal(response.status, 200)
    assert.deepEqual(response.body.data.drivingSchoolIds, [passedStudent.drivingSchoolId])
    assert.equal((await kit.call('GET', '/api/instructor/eligible-students', { cookie: student.cookie })).status, 403)
    const otherInstructorOptions = await kit.call('GET', '/api/instructor/eligible-students', { cookie: otherInstructor.cookie })
    assert.deepEqual(otherInstructorOptions.body.data.drivingSchoolIds, [])
  })
})

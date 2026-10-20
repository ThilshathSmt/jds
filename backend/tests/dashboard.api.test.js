import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import pool from '../config/database.js'
import { addDays, getSchoolDate } from '../utils/dateUtils.js'
import { createApiTestKit, isDatabaseReachable } from './helpers/apiTestKit.js'

const databaseReady = await isDatabaseReachable()
const kit = createApiTestKit()

describe('Dashboard API', { skip: !databaseReady && 'database is not reachable' }, () => {
  let admin, student, instructor
  before(async () => {
    await kit.start()
    admin = await kit.createSignedInUser('dashboard-admin', 'admin')
    student = await kit.createSignedInUser('dashboard-student', 'student')
    instructor = await kit.createSignedInUser('dashboard-instructor', 'instructor')
  })
  after(async () => kit.cleanUp())

  test('requires authentication and the matching role', async () => {
    assert.equal((await kit.call('GET', '/api/admin/dashboard')).status, 401)
    assert.equal((await kit.call('GET', '/api/student/dashboard', { cookie: admin.cookie })).status, 403)
    assert.equal((await kit.call('GET', '/api/instructor/dashboard', { cookie: student.cookie })).status, 403)
    assert.equal((await kit.call('GET', '/api/admin/dashboard', { cookie: instructor.cookie })).status, 403)
  })

  test('returns structured live admin counts and a consistent lesson breakdown', async () => {
    const response = await kit.call('GET', '/api/admin/dashboard', { cookie: admin.cookie })
    assert.equal(response.status, 200)
    const { stats, bookings, registrations } = response.body.data
    for (const value of Object.values(stats)) assert.equal(typeof value, 'number')
    assert.equal(bookings.total, bookings.confirmed + bookings.pending + bookings.completed + bookings.cancelled + bookings.absent)
    assert.ok(Array.isArray(registrations))
    assert.ok(registrations.length <= 5)
  })

  test('student and instructor data comes from the signed-in identity', async () => {
    const studentResponse = await kit.call('GET', '/api/student/dashboard', { cookie: student.cookie })
    assert.equal(studentResponse.status, 200)
    assert.equal(studentResponse.body.data.course, null)
    assert.equal(studentResponse.body.data.lessonsCompleted, 0)
    assert.equal(studentResponse.body.data.upcomingLessons, 0)
    assert.equal(studentResponse.body.data.upcomingLesson, null)

    const instructorResponse = await kit.call('GET', '/api/instructor/dashboard', { cookie: instructor.cookie })
    assert.equal(instructorResponse.status, 200)
    assert.deepEqual(instructorResponse.body.data.stats, { today: 0, upcoming: 0, students: 0, completed: 0 })
    assert.deepEqual(instructorResponse.body.data.schedule, [])
    assert.deepEqual(instructorResponse.body.data.students, [])
  })

  test('counts scheduled lessons once, calculates progress, and sorts real registrations newest first', async () => {
    const assignedStudent = await kit.createSignedInUser('dashboard-assigned-student', 'student')
    const assignedInstructor = await kit.createSignedInUser('dashboard-assigned-instructor', 'instructor')
    const [[course]] = await pool.execute('SELECT id, name, price FROM driving_school_packages WHERE is_active = 1 ORDER BY sort_order, id LIMIT 1')
    const beforeAdmin = (await kit.call('GET', '/api/admin/dashboard', { cookie: admin.cookie })).body.data
    const today = getSchoolDate()
    const [cycle] = await pool.execute('INSERT INTO practical_cycles (user_id, cycle_number) VALUES (?, 1)', [assignedStudent.id])
    await pool.execute('INSERT INTO practical_cycle_instructors (cycle_id, instructor_id) VALUES (?, ?)', [cycle.insertId, assignedInstructor.id])

    const schedule = [
      [today, null, 'PENDING'], [addDays(today, 1), '10:00', 'PENDING'],
      [addDays(today, 6), '10:00', 'PENDING'], [addDays(today, 7), '10:00', 'PENDING'],
      [addDays(today, -1), '10:00', 'ATTENDED'], [addDays(today, -2), '10:00', 'ATTENDED'],
      [addDays(today, -3), '10:00', 'ABSENT'],
    ]
    for (let index = 0; index < schedule.length; index += 1) {
      const [date, time, attendance] = schedule[index]
      await pool.execute(`INSERT INTO practical_lessons
        (cycle_id, lesson_number, instructor_id, lesson_date, start_time, attendance,
         attendance_marked_by, attendance_marked_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        cycle.insertId, index + 1, assignedInstructor.id, date, time, attendance,
        attendance === 'PENDING' ? null : assignedInstructor.id,
        attendance === 'PENDING' ? null : new Date(),
      ])
    }

    for (let daysAgo = 5; daysAgo >= 0; daysAgo -= 1) {
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      await pool.execute(`INSERT INTO registration_applications
        (full_name, mobile_number, nic, address, package_id, package_name, package_price,
         minimum_payment, payment_method, status, application_type, user_id, approved_at, created_at)
        VALUES (?, '0771234567', '123456789V', 'Test address', ?, ?, ?, 0,
          'visit-branch', ?, 'NEW_STUDENT', ?, ?, ?)`, [
        `${kit.run} Applicant ${daysAgo}`, course.id, course.name, course.price,
        daysAgo === 0 ? 'APPROVED' : 'NEW', assignedStudent.id,
        daysAgo === 0 ? createdAt : null, createdAt,
      ])
    }

    const studentData = (await kit.call('GET', '/api/student/dashboard', { cookie: assignedStudent.cookie })).body.data
    assert.equal(studentData.course, course.name)
    assert.equal(studentData.lessonsCompleted, 2)
    assert.equal(studentData.upcomingLessons, 3)
    assert.equal(studentData.progress, 20)
    assert.equal(studentData.upcomingLesson.date, addDays(today, 1))

    const instructorData = (await kit.call('GET', '/api/instructor/dashboard', { cookie: assignedInstructor.cookie })).body.data
    assert.deepEqual(instructorData.stats, { today: 1, upcoming: 2, students: 1, completed: 2 })
    assert.equal(instructorData.schedule.length, 1)
    assert.equal(instructorData.students.length, 1)
    assert.equal(instructorData.students[0].progress, 20)

    const afterAdmin = (await kit.call('GET', '/api/admin/dashboard', { cookie: admin.cookie })).body.data
    assert.equal(afterAdmin.bookings.total - beforeAdmin.bookings.total, 7)
    assert.equal(afterAdmin.bookings.pending - beforeAdmin.bookings.pending, 4)
    assert.equal(afterAdmin.bookings.completed - beforeAdmin.bookings.completed, 2)
    assert.equal(afterAdmin.bookings.absent - beforeAdmin.bookings.absent, 1)
    assert.equal(afterAdmin.registrations[0].student, `${kit.run} Applicant 0`)
  })
})

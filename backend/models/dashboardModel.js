// Read-only dashboard queries. Every count is scoped in SQL before joins can multiply rows.
import pool from '../config/database.js'

const asNumber = (value) => Number(value ?? 0)

export const getAdminDashboard = async () => {
  const [[accounts]] = await pool.execute(`SELECT
    SUM(role = 'student') AS students,
    SUM(role = 'student' AND status = 'active') AS active_students,
    SUM(role = 'instructor') AS instructors,
    SUM(role = 'instructor' AND status = 'active') AS active_instructors
    FROM users WHERE role IN ('student', 'instructor')`)
  const [[packages]] = await pool.execute('SELECT COUNT(*) AS total FROM driving_school_packages WHERE is_active = 1')
  const [lessonRows] = await pool.execute(`SELECT attendance, COUNT(*) AS total
    FROM practical_lessons WHERE lesson_date IS NOT NULL GROUP BY attendance`)
  const lessons = { PENDING: 0, ATTENDED: 0, ABSENT: 0 }
  for (const row of lessonRows) lessons[row.attendance] = asNumber(row.total)
  const [registrations] = await pool.execute(`SELECT id, full_name AS student,
    package_name AS course, status, DATE_FORMAT(created_at, '%Y-%m-%d') AS date
    FROM registration_applications WHERE application_type = 'NEW_STUDENT'
    ORDER BY created_at DESC, id DESC LIMIT 5`)
  const totalLessons = Object.values(lessons).reduce((sum, count) => sum + count, 0)
  return {
    stats: {
      students: asNumber(accounts.students), activeStudents: asNumber(accounts.active_students),
      instructors: asNumber(accounts.instructors), activeInstructors: asNumber(accounts.active_instructors),
      activeCourses: asNumber(packages.total), pendingBookings: lessons.PENDING,
    },
    bookings: { total: totalLessons, pending: lessons.PENDING, confirmed: 0, completed: lessons.ATTENDED,
      cancelled: 0, absent: lessons.ABSENT },
    registrations,
  }
}

const courseJoin = `LEFT JOIN registration_applications a ON a.id = (
  SELECT a2.id FROM registration_applications a2
  WHERE (a2.user_id = u.id OR a2.driving_school_id = u.driving_school_id)
    AND a2.status = 'APPROVED'
  ORDER BY COALESCE(a2.approved_at, a2.created_at) DESC, a2.id DESC LIMIT 1
)`

export const getStudentDashboard = async (studentId, { date, time, lessonRequirement }) => {
  const [[student]] = await pool.execute(`SELECT u.id, a.package_name AS course
    FROM users u ${courseJoin} WHERE u.id = ? AND u.role = 'student'`, [studentId])
  const [[counts]] = await pool.execute(`SELECT
    (SELECT COUNT(*) FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
      WHERE c.user_id = ? AND l.attendance = 'ATTENDED') AS completed,
    (SELECT COUNT(*) FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
      WHERE c.user_id = ? AND c.status = 'ACTIVE' AND l.attendance = 'PENDING'
        AND l.lesson_date IS NOT NULL AND (l.lesson_date > ? OR (l.lesson_date = ? AND l.start_time > ?))) AS upcoming,
    (SELECT COUNT(*) FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
      WHERE c.user_id = ? AND c.id = (SELECT MAX(latest.id) FROM practical_cycles latest WHERE latest.user_id = c.user_id)
        AND l.attendance = 'ATTENDED') AS current_completed`,
  [studentId, studentId, date, date, time, studentId])
  const [nextRows] = await pool.execute(`SELECT l.id, DATE_FORMAT(l.lesson_date, '%Y-%m-%d') AS date,
    TIME_FORMAT(l.start_time, '%H:%i') AS time, l.attendance AS status,
    iu.name AS instructor, iu.responsibility AS vehicle
    FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
    LEFT JOIN users iu ON iu.id = l.instructor_id
    WHERE c.user_id = ? AND c.status = 'ACTIVE' AND l.attendance = 'PENDING' AND l.lesson_date IS NOT NULL
      AND (l.lesson_date > ? OR (l.lesson_date = ? AND l.start_time > ?))
    ORDER BY l.lesson_date, l.start_time, l.lesson_number LIMIT 1`, [studentId, date, date, time])
  const [activity] = await pool.execute(`SELECT id, title, detail, date, type FROM (
    SELECT CONCAT('notification-', n.id) AS id, n.title, n.message AS detail, n.created_at AS date, n.type, n.id AS sort_id
      FROM notifications n WHERE n.user_id = ?
    UNION ALL
    SELECT CONCAT('lesson-', l.id) AS id, 'Lesson completed' AS title,
      CONCAT('Practical lesson ', l.lesson_number) AS detail, l.attendance_marked_at AS date,
      'LESSON_COMPLETED' AS type, l.id AS sort_id
      FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
      WHERE c.user_id = ? AND l.attendance = 'ATTENDED' AND l.attendance_marked_at IS NOT NULL
    UNION ALL
    SELECT CONCAT('payment-', p.id) AS id, 'Payment received' AS title,
      'Practical reattempt payment approved' AS detail, p.reviewed_at AS date,
      'PAYMENT_RECEIVED' AS type, p.id AS sort_id
      FROM practical_reattempt_payments p WHERE p.user_id = ? AND p.status = 'APPROVED' AND p.reviewed_at IS NOT NULL
  ) events ORDER BY date DESC, sort_id DESC LIMIT 5`, [studentId, studentId, studentId])
  const completed = asNumber(counts.current_completed)
  return {
    course: student?.course ?? null,
    lessonsCompleted: asNumber(counts.completed),
    upcomingLessons: asNumber(counts.upcoming),
    progress: student?.course && lessonRequirement > 0 ? Math.min(100, Math.round((completed / lessonRequirement) * 100)) : 0,
    progressRequirement: lessonRequirement,
    upcomingLesson: nextRows[0] ?? null,
    activity,
  }
}

export const getInstructorDashboard = async (instructorId, { date, time, weekEnd, lessonRequirement }) => {
  const [[counts]] = await pool.execute(`SELECT
    (SELECT COUNT(*) FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
      WHERE l.instructor_id = ? AND c.status = 'ACTIVE' AND l.lesson_date = ?) AS today,
    (SELECT COUNT(*) FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
      WHERE l.instructor_id = ? AND c.status = 'ACTIVE' AND l.attendance = 'PENDING'
        AND l.lesson_date IS NOT NULL AND (l.lesson_date > ? OR (l.lesson_date = ? AND l.start_time > ?))
        AND l.lesson_date <= ?) AS upcoming,
    (SELECT COUNT(*) FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
      WHERE l.instructor_id = ? AND l.attendance = 'ATTENDED') AS completed,
    (SELECT COUNT(DISTINCT c.user_id) FROM practical_cycle_instructors ci JOIN practical_cycles c ON c.id = ci.cycle_id
      WHERE ci.instructor_id = ?) AS students`,
  [instructorId, date, instructorId, date, date, time, weekEnd, instructorId, instructorId])
  const [schedule] = await pool.execute(`SELECT l.id, TIME_FORMAT(l.start_time, '%H:%i') AS time,
    su.name AS student, COALESCE(a.package_name, 'Course unavailable') AS course,
    l.attendance AS status
    FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
    JOIN users su ON su.id = c.user_id
    LEFT JOIN registration_applications a ON a.id = (
      SELECT a2.id FROM registration_applications a2
      WHERE (a2.user_id = su.id OR a2.driving_school_id = su.driving_school_id) AND a2.status = 'APPROVED'
      ORDER BY COALESCE(a2.approved_at, a2.created_at) DESC, a2.id DESC LIMIT 1
    )
    WHERE l.instructor_id = ? AND c.status = 'ACTIVE' AND l.lesson_date = ?
    ORDER BY l.start_time, su.name, l.lesson_number`, [instructorId, date])
  const [students] = await pool.execute(`SELECT su.id, su.name AS student,
    COALESCE(a.package_name, 'Course unavailable') AS course, su.status AS accountStatus,
    c.status AS trainingStatus,
    (SELECT COUNT(*) FROM practical_lessons done WHERE done.cycle_id = c.id AND done.attendance = 'ATTENDED') AS completed,
    (SELECT MAX(assigned_lesson.lesson_date) FROM practical_lessons assigned_lesson
      WHERE assigned_lesson.cycle_id = c.id AND assigned_lesson.instructor_id = ?) AS lastLessonDate
    FROM practical_cycles c JOIN practical_cycle_instructors ci ON ci.cycle_id = c.id AND ci.instructor_id = ?
    JOIN users su ON su.id = c.user_id
    LEFT JOIN registration_applications a ON a.id = (
      SELECT a2.id FROM registration_applications a2
      WHERE (a2.user_id = su.id OR a2.driving_school_id = su.driving_school_id) AND a2.status = 'APPROVED'
      ORDER BY COALESCE(a2.approved_at, a2.created_at) DESC, a2.id DESC LIMIT 1
    )
    WHERE c.id = (SELECT MAX(latest.id) FROM practical_cycles latest
      JOIN practical_cycle_instructors latest_assignment ON latest_assignment.cycle_id = latest.id
      WHERE latest.user_id = c.user_id AND latest_assignment.instructor_id = ?)
    ORDER BY lastLessonDate DESC, c.created_at DESC, su.name LIMIT 10`, [instructorId, instructorId, instructorId])
  return {
    stats: { today: asNumber(counts.today), upcoming: asNumber(counts.upcoming), students: asNumber(counts.students), completed: asNumber(counts.completed) },
    schedule,
    students: students.map(({ completed, ...row }) => ({ ...row, progress: row.course !== 'Course unavailable' && lessonRequirement > 0 ? Math.min(100, Math.round((asNumber(completed) / lessonRequirement) * 100)) : 0 })),
  }
}

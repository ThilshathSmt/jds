import { LESSONS_PER_CYCLE } from '../config/practical.js'
import * as dashboardModel from '../models/dashboardModel.js'
import { addDays, getSchoolDate, getSchoolTime } from '../utils/dateUtils.js'
import { sendSuccess } from '../utils/responseUtils.js'

export const adminDashboard = async (req, res) => {
  const data = await dashboardModel.getAdminDashboard()
  sendSuccess(res, { message: 'Admin dashboard', data })
}

export const studentDashboard = async (req, res) => {
  const now = new Date()
  const data = await dashboardModel.getStudentDashboard(req.user.id, {
    date: getSchoolDate(now), time: getSchoolTime(now), lessonRequirement: LESSONS_PER_CYCLE,
  })
  sendSuccess(res, { message: 'Student dashboard', data })
}

export const instructorDashboard = async (req, res) => {
  const now = new Date()
  const date = getSchoolDate(now)
  const data = await dashboardModel.getInstructorDashboard(req.user.id, {
    date, time: getSchoolTime(now), weekEnd: addDays(date, 6), lessonRequirement: LESSONS_PER_CYCLE,
  })
  sendSuccess(res, { message: 'Instructor dashboard', data })
}

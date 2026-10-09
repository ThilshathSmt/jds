// Role-protected test endpoints. Access is decided by the middleware in the routes;
// real dashboard data will be added here later.

import { sendSuccess } from '../utils/responseUtils.js'

const dashboardHandler = (label) => (req, res) => {
  sendSuccess(res, {
    message: `${label} dashboard access granted`,
    data: { role: req.user.role },
  })
}

export const adminDashboard = dashboardHandler('Admin')
export const studentDashboard = dashboardHandler('Student')
export const instructorDashboard = dashboardHandler('Instructor')

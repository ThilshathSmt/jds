import { apiRequest } from './apiClient'

export const getAdminDashboard = () => apiRequest('/api/admin/dashboard')
export const getStudentDashboard = () => apiRequest('/api/student/dashboard')
export const getInstructorDashboard = () => apiRequest('/api/instructor/dashboard')

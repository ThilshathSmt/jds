import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import GuestRoute from './components/auth/GuestRoute'
import ProtectedRoute from './components/auth/ProtectedRoute'
import DashboardLayout from './components/dashboard/DashboardLayout'
import Home from './pages/Home'
import ExamPapers from './pages/ExamPapers'
import ExamPaperDetail from './pages/ExamPaperDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Registration from './pages/Registration'
import AdminDashboard from './pages/admin/AdminDashboard'
import ManageUsers from './pages/admin/ManageUsers'
import RegistrationFormDetails from './pages/admin/RegistrationFormDetails'
import RegistrationForms from './pages/admin/RegistrationForms'
import StudentDashboard from './pages/student/StudentDashboard'
import InstructorDashboard from './pages/instructor/InstructorDashboard'
import { adminPanel } from './data/adminDashboardData'
import { studentPanel } from './data/studentDashboardData'
import { instructorPanel } from './data/instructorDashboardData'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          {/* /apply is the student application form; /register creates a portal account */}
          <Route path="/apply" element={<Registration />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/exam-papers" element={<ExamPapers />} />
          <Route path="/exam-papers/:paperId" element={<ExamPaperDetail />} />
        </Route>

        {/* Dashboard panels: each needs a signed-in user with the matching role.
            The backend enforces the same rule on its /api/<role> routes. */}
        <Route
          path="/admin-dashboard"
          element={<ProtectedRoute role="admin"><DashboardLayout {...adminPanel} /></ProtectedRoute>}
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="registration-forms" element={<RegistrationForms />} />
          <Route path="registration-forms/:applicationId" element={<RegistrationFormDetails />} />
        </Route>
        {/* Short address for the Registration Forms page */}
        <Route
          path="/admin/registration-forms"
          element={<Navigate to="/admin-dashboard/registration-forms" replace />}
        />
        <Route
          path="/student-dashboard"
          element={<ProtectedRoute role="student"><DashboardLayout {...studentPanel} /></ProtectedRoute>}
        >
          <Route index element={<StudentDashboard />} />
        </Route>
        <Route
          path="/instructor-dashboard"
          element={
            <ProtectedRoute role="instructor"><DashboardLayout {...instructorPanel} /></ProtectedRoute>
          }
        >
          <Route index element={<InstructorDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

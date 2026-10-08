import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardLayout from './components/dashboard/DashboardLayout'
import Home from './pages/Home'
import ExamPapers from './pages/ExamPapers'
import ExamPaperDetail from './pages/ExamPaperDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Registration from './pages/Registration'
import AdminDashboard from './pages/admin/AdminDashboard'
import ManageUsers from './pages/admin/ManageUsers'
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
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/exam-papers" element={<ExamPapers />} />
          <Route path="/exam-papers/:paperId" element={<ExamPaperDetail />} />
        </Route>

        {/* Dashboard panels. Intentionally open to anyone for now.
            TODO: Add login redirection and role-based route protection once the backend exists */}
        <Route path="/admin-dashboard" element={<DashboardLayout {...adminPanel} />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
        </Route>
        <Route path="/student-dashboard" element={<DashboardLayout {...studentPanel} />}>
          <Route index element={<StudentDashboard />} />
        </Route>
        <Route path="/instructor-dashboard" element={<DashboardLayout {...instructorPanel} />}>
          <Route index element={<InstructorDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

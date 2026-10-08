import { FaUsersGear } from 'react-icons/fa6'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'

// Placeholder page. TODO: Implement user management (list, create, edit, deactivate) with the backend.
function ManageUsers() {
  return (
    <>
      <DashboardWelcome title="Manage Users" icon={FaUsersGear} />

      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm sm:p-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-3xl text-brand">
          <FaUsersGear aria-hidden="true" />
        </span>
        <p className="mt-5 text-gray-600">
          User management functionality will be implemented later.
        </p>
      </section>
    </>
  )
}

export default ManageUsers

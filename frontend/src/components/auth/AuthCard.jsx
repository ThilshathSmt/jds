import AuthLogo from './AuthLogo'

// Centered card shared by the login and register pages
function AuthCard({ title, children }) {
  return (
    <section className="bg-gray-50 py-10 sm:py-14">
      <div className="container-page">
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm sm:px-12 sm:py-10">
          <AuthLogo />
          <h1 className="mt-6 mb-8 flex items-center gap-4 text-center text-lg font-medium text-gray-700 before:h-px before:flex-1 before:bg-gray-300 after:h-px after:flex-1 after:bg-gray-300">
            {title}
          </h1>
          {children}
        </div>
      </div>
    </section>
  )
}

export default AuthCard

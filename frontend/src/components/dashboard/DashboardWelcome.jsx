import UserAvatar from './UserAvatar'

// Banner at the top of each dashboard page: heading, welcome message and profile picture
function DashboardWelcome({ title, message, user, icon: Icon }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-deep via-brand-dark to-brand p-6 text-white shadow-md sm:p-8">
      <span
        className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10"
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl xl:text-4xl">
            {Icon && <Icon aria-hidden="true" className="shrink-0" />}
            {title}
          </h1>
          {message && <p className="mt-2 text-base text-white/90 sm:text-lg">{message}</p>}
        </div>
        {user && (
          <span className="relative hidden shrink-0 sm:block">
            <UserAvatar user={user} size="lg" className="ring-4" />
            <span
              className="absolute right-1 bottom-1 h-5 w-5 rounded-full bg-emerald-500 ring-2 ring-white"
              aria-hidden="true"
            />
          </span>
        )}
      </div>
    </section>
  )
}

export default DashboardWelcome

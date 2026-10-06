function RegistrationHeader() {
  return (
    <header>
      <h1 className="text-center text-2xl font-bold text-ink sm:text-3xl">
        Welcome to Online Registration
      </h1>
      <span className="mx-auto mt-4 block h-1 w-16 rounded-full bg-brand" aria-hidden="true" />
      <p className="mt-6 font-semibold text-brand">Important</p>
      <p className="mt-1 text-gray-700">
        Please fill out the form below to register and become a member of the Jeslan Driving School
        Family.
      </p>
    </header>
  )
}

export default RegistrationHeader

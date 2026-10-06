import Logo from '../Logo'

// Reuses the site logo, so replacing the logo asset updates the auth pages too
function AuthLogo() {
  return (
    <div className="flex justify-center">
      <Logo />
    </div>
  )
}

export default AuthLogo

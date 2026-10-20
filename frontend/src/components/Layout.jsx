import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import HomePageBackground from './HomePageBackground'

// Shared page shell: sticky header, routed page content, footer
function Layout() {
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  // Scroll to the linked section (e.g. /#contact) or to the top on page change
  useEffect(() => {
    const target = location.hash && document.getElementById(location.hash.slice(1))
    if (target) target.scrollIntoView()
    else if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location])

  return (
    <>
      <Header />
      {isHomePage ? (
        <HomePageBackground>
          <main>
            <Outlet />
          </main>
          <Footer reveal />
        </HomePageBackground>
      ) : (
        <>
          <main>
            <Outlet />
          </main>
          <Footer />
        </>
      )}
    </>
  )
}

export default Layout

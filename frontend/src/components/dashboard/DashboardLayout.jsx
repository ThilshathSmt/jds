import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { FaAnglesLeft, FaAnglesRight } from 'react-icons/fa6'
import DashboardHeader from './DashboardHeader'
import DashboardSidebar from './DashboardSidebar'
import MobileSidebar from './MobileSidebar'

// Shared shell for the Admin, Student and Instructor panels: header, sidebar and routed page.
// TODO: Protect these routes with backend role-based access control. For now anyone can open them.
function DashboardLayout({ role, panelTitle, user, menuItems }) {
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const sidebarProps = { panelTitle, user, menuItems }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div data-role={role} className="min-h-dvh bg-gray-100">
      <DashboardHeader
        panelTitle={panelTitle}
        user={user}
        menuOpen={drawerOpen}
        onMenuClick={() => setDrawerOpen(true)}
      />
      <MobileSidebar open={drawerOpen} onClose={closeDrawer} {...sidebarProps} />

      <div className="flex">
        {/* Desktop sidebar: stays in place under the header while the page scrolls */}
        <aside
          className={`sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 transition-[width] duration-300 lg:block ${collapsed ? 'w-20' : 'w-64'}`}
        >
          <DashboardSidebar
            {...sidebarProps}
            collapsed={collapsed}
            toggle={{
              icon: collapsed ? FaAnglesRight : FaAnglesLeft,
              label: collapsed ? 'Expand sidebar' : 'Collapse sidebar',
              onClick: () => setCollapsed((value) => !value),
            }}
          />
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 xl:p-8">
          <div className="mx-auto flex max-w-[100rem] flex-col gap-6">
            {/* Pages read the panel details with useOutletContext() */}
            <Outlet context={{ role, panelTitle, user }} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout

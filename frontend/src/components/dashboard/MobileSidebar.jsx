import { useEffect } from 'react'
import { FaXmark } from 'react-icons/fa6'
import DashboardSidebar from './DashboardSidebar'

// Off-canvas drawer version of the sidebar for screens below the lg breakpoint
function MobileSidebar({ open, onClose, ...sidebarProps }) {
  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  return (
    <div
      id="dashboard-drawer"
      inert={!open}
      className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 cursor-pointer bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        className={`relative h-full w-72 max-w-[85vw] shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <DashboardSidebar
          {...sidebarProps}
          toggle={{ icon: FaXmark, label: 'Close menu', onClick: onClose }}
          onNavigate={onClose}
        />
      </aside>
    </div>
  )
}

export default MobileSidebar

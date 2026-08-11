import type { ReactNode } from 'react'
import { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'

export { Header, Sidebar, Footer }

// Main layout for authenticated pages
export function AppLayout({ children, showSidebar = true }: { children: ReactNode; showSidebar?: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        {showSidebar && (
          <>
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            {/* Sidebar - drawer on mobile, sidebar on desktop */}
            <div className={`
              fixed md:static top-0 md:top-auto left-0 z-50 h-screen md:h-auto transform transition-transform duration-200 ease-in-out
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              md:translate-x-0
            `}>
              <Sidebar onLinkClick={() => setSidebarOpen(false)} />
            </div>
          </>
        )}
        <main className="flex-1 p-3 md:p-4 bg-base-100 min-h-[calc(100vh-4rem)] overflow-x-hidden">{children}</main>
      </div>
      <Footer />
    </div>
  )
}

// Public layout (no sidebar)
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

// Auth layout (centered, for login/register)
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center bg-base-200">
        {children}
      </div>
      <Footer />
    </div>
  )
}
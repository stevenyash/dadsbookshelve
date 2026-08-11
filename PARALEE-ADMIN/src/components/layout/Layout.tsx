import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useAuth } from '../../hooks/useJobs';
import { clsx } from 'clsx';
import { BookOpen, Settings, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/jobs', label: 'Jobs', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { logout: doLogout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await doLogout();
    } catch {
      // ignore errors on logout
    }
    logout();
    navigate('/login');
  };

  return (
    <div className="drawer lg:drawer-open">
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" checked={sidebarOpen} onChange={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="drawer-content flex flex-col bg-slate-50">
        {/* Top Navbar */}
        <div className="navbar bg-base-100 shadow-sm border-b border-base-200 lg:hidden">
          <div className="flex-none">
            <label htmlFor="sidebar-drawer" className="btn btn-square btn-ghost">
              <Menu size={20} />
            </label>
          </div>
          <div className="flex-1">
            <span className="text-lg font-semibold">Paralee Admin</span>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-40">
        <label htmlFor="sidebar-drawer" className="drawer-overlay" onClick={() => setSidebarOpen(false)}></label>
        <aside className="bg-slate-900 w-64 min-h-screen flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white">Paralee Admin</h1>
            <p className="text-xs text-slate-400 mt-1">Book Conversion Manager</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-10">
                  <span className="text-sm">{user?.name?.charAt(0) || 'A'}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

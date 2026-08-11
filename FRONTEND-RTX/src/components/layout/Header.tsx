import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/store/store'
import { useCart } from '@/store/cartStore'
import { useState, useEffect } from 'react'
import {
  Menu,
  X,
  LogOut,
  LogIn,
  ShoppingCart,
  User,
  ChevronDown,
  BookOpen,
  Store,
  FileText,
  HelpCircle,
  Home,
  Library,
  Shield
} from 'lucide-react'

// Public navigation items with icons
const publicNavItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Library', path: '/dbslibrary', icon: Library },
  { label: 'Conversion', path: '/ebook', icon: FileText },
  { label: 'Shop', path: '/books/shop', icon: Store },
  { label: 'About', path: '/aboutus', icon: BookOpen },
  { label: 'Help', path: '/help', icon: HelpCircle },
]

// Auth navigation (simplified)
const authNavItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Library', path: '/dbslibrary', icon: Library },
  { label: 'Conversion', path: '/ebook', icon: FileText },
  { label: 'Shop', path: '/books/shop', icon: Store },
  { label: 'My Library', path: '/library/offline', icon: Library },
  { label: 'Orders', path: '/orders', icon: FileText },
]

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps = {}) {
  const { logout, isAuthenticated, user } = useAuth()
  const { totalItems: cartCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = isAuthenticated ? authNavItems : publicNavItems

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Close mobile menu on route change
  useEffect(() => setMobileMenuOpen(false), [location.pathname])

  return (
    <header className="sticky top-0 z-50">
      {/* Main gradient bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
      
      <div className="navbar max-w-7xl mx-auto px-4 bg-base-100 shadow-sm">
        {/* Logo */}
        <div className="flex-1">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="relative">
              <img src="/logo.png" alt="DBS" className="h-10 w-10 object-contain" />
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-success rounded-full border-2 border-base-100"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl leading-tight text-base-content">DBS</span>
              <span className="text-[10px] text-base-content/60 font-medium tracking-wide uppercase hidden sm:block">Bookshelves</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  btn btn-ghost btn-sm gap-2 transition-all duration-200
                  ${isActive 
                    ? 'btn-active text-primary font-semibold' 
                    : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right section */}
        <div className="flex-none flex items-center gap-2">
          {/* Cart Button - Only show when authenticated */}
          {isAuthenticated && (
            <Link 
              to="/cart" 
              className="btn btn-ghost btn-circle relative btn-sm"
              title="Shopping Cart"
              aria-label={`Shopping Cart with ${cartCount} items`}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 badge badge-primary badge-xs flex items-center justify-center min-w-[1.25rem] h-5 px-1">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          )}

          {/* User Menu */}
          {isAuthenticated ? (
            <div data-dropdown className="dropdown dropdown-end">
              <button
                tabIndex={0}
                data-dropdown-toggle
                className="btn btn-ghost btn-sm gap-2"
                aria-label="User menu"
              >
                <div className="avatar placeholder online-indicator">
                  <div className="bg-neutral text-neutral-content rounded-full w-8">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>
              <ul
                data-dropdown-content
                className="dropdown-content z-[100] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-200"
              >
                <li className="menu-title px-3 py-2 text-xs text-base-content/60 uppercase tracking-wide">
                  <span className="truncate">{user?.name?.split(' ')[0] || 'User'}</span>
                </li>
                <li>
                  <Link to="/profile" className="gap-2">
                    <User className="w-4 h-4" />
                    My Profile
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="gap-2">
                    <BookOpen className="w-4 h-4" />
                    Dashboard
                  </Link>
                </li>
                {user?.role === 'admin' || user?.role === 'super_admin' ? (
                  <li>
                    <Link to="/admin/users" className="gap-2">
                      <Shield className="w-4 h-4" />
                      Admin Panel
                    </Link>
                  </li>
                ) : null}
                <li className="border-t border-base-200 mt-1 pt-1">
                  <button onClick={handleLogout} className="gap-2 text-error">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/register" className="btn btn-ghost btn-sm">
                Register
              </Link>
              <Link to="/login" className="btn btn-primary btn-sm gap-2">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          {onMenuClick ? (
            <button
              className="btn btn-ghost btn-square btn-sm md:hidden"
              onClick={() => {
                onMenuClick()
                setMobileMenuOpen(false)
              }}
              title="Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          ) : (
            <button
              className="btn btn-ghost btn-square btn-sm md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="Menu"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {!onMenuClick && mobileMenuOpen && (
        <div className="lg:hidden border-t border-base-200 bg-base-100 shadow-lg">
          <div className="p-4 space-y-1">
            {/* Nav Items */}
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-primary/10 text-primary font-semibold' 
                      : 'text-base-content hover:bg-base-200'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            {/* Auth Links */}
            {!isAuthenticated && (
              <div className="pt-4 mt-4 border-t border-base-200 space-y-2">
                <Link to="/login" className="btn btn-outline btn-sm w-full justify-start gap-2">
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm w-full justify-start gap-2">
                  Register
                </Link>
              </div>
            )}

            {isAuthenticated && (
              <div className="pt-4 mt-4 border-t border-base-200">
                <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-base-200">
                  <User className="w-5 h-5" />
                  My Profile
                </Link>
                <Link to="/dashboard" className="flex items-center gap-3 rounded-lg hover:bg-base-200">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <BookOpen className="w-5 h-5" />
                    Dashboard
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-error hover:bg-base-200 w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
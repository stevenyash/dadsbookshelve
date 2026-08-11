import { PermissionConfig } from './permissions'

export const adminMenuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'Sliders', path: '/admin/sliders', icon: '🎠' },
  { label: 'Featured', path: '/admin/featured', icon: '⭐' },
  { label: 'Users', path: '/users', icon: '👥' },
  { label: 'Marketers', path: '/marketers', icon: '📢' },
  { label: 'Books', path: '/books', icon: '📚' },
  { label: 'Library', path: '/librarybooks', icon: '🏛️' },
  { label: 'Payments', path: '/payments', icon: '💳' },
  { label: 'Reports', path: '/salesreports', icon: '📈' },
  { label: 'Settings', path: '/settings', icon: '⚙️' },
] as const

export const marketerMenuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'My Wallet', path: '/marketers/wallet', icon: '💰' },
  { label: 'Referrals', path: '/referrals', icon: '👥' },
  { label: 'Affiliate Links', path: '/affiliatelinks', icon: '🔗' },
] as const

export const publicMenuItems = [
  { label: 'Home', path: '/', icon: '🏠' },
  { label: 'Library', path: '/dbslibrary', icon: '📚' },
  { label: 'Conversion', path: '/ebook', icon: '📖' },
  { label: 'Shop', path: '/books/shop', icon: '🛒' },
] as const

export const AppMenus = {
  adminMenuItems,
  marketerMenuItems,
  publicMenuItems,
}

export default AppMenus
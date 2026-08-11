import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { usePermissions } from '@/hooks/usePermissions'
import {
  LayoutDashboard, Users, Users2, BookOpen, GraduationCap,
  Wallet, FileBarChart, Settings, CreditCard, ShoppingCart,
  Library, Megaphone, Link2, Building, Shield, Trash2
} from 'lucide-react'

// Icon mapping
const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  'dashboard': LayoutDashboard,
  'users': Users,
  'megaphone': Megaphone,
  'book': BookOpen,
  'library': Library,
  'creditcard': CreditCard,
  'chart': FileBarChart,
  'settings': Settings,
  'wallet': Wallet,
  'users2': Users2,
  'link': Link2,
  'building': Building,
  'shield': Shield,
  'cart': ShoppingCart,
  'orders': FileBarChart,
  'trash': Trash2,
}

interface MenuItem {
  label: string
  path?: string
  icon: string
  module?: string
  action?: string
  children?: MenuItem[]
  key?: string
}

const menuConfig: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', module: 'dashboard', action: 'view', key: 'dashboard' },
  {
    label: 'Homepage',
    icon: 'megaphone',
    key: 'homepage',
    children: [
      { label: 'Sliders', path: '/admin/sliders', icon: 'megaphone', module: 'sliders', action: 'view', key: 'sliders' },
      { label: 'Featured', path: '/admin/featured', icon: 'megaphone', module: 'featured', action: 'view', key: 'featured' },
      { label: 'Stories', path: '/admin/stories', icon: 'megaphone', module: 'stories', action: 'view', key: 'stories' },
    ],
  },
  {
    label: 'Administration',
    icon: 'shield',
    key: 'admin',
    children: [
      { label: 'Users', path: '/admin/users', icon: 'users', module: 'users', action: 'view', key: 'users' },
      { label: 'Roles', path: '/admin/roles', icon: 'shield', module: 'roles', action: 'view', key: 'roles' },
      { label: 'Permissions', path: '/admin/permissions', icon: 'shield', module: 'roles', action: 'view', key: 'permissions' },
      { label: 'Marketers', path: '/marketers', icon: 'megaphone', module: 'marketers', action: 'view', key: 'marketers' },
    ],
  },
  {
    label: 'Management',
    icon: 'book',
    key: 'management',
    children: [
      { label: 'Books', path: '/books', icon: 'book', module: 'books', action: 'view', key: 'books' },
      { label: 'Orders', path: '/admin/orders', icon: 'orders', module: 'orders', action: 'view', key: 'orders' },
      { label: 'Payments', path: '/admin/payments', icon: 'creditcard', module: 'payments', action: 'view', key: 'payments' },
      { label: 'File Cleanup', path: '/admin/file-cleanup', icon: 'trash', module: 'file_cleanup', action: 'delete', key: 'file-cleanup' },
    ],
  },
  {
    label: 'My Services',
    icon: 'library',
    key: 'services',
    children: [
      { label: 'DBS Library', path: '/dbslibrary', icon: 'library', module: 'library', action: 'view', key: 'dbslibrary' },
      { label: 'DBS Shop', path: '/books/shop', icon: 'book', module: 'shop', action: 'view', key: 'shop' },
      { label: 'DBS Cart', path: '/cart', icon: 'cart', module: 'cart', action: 'view', key: 'cart' },
      { label: 'DBS Orders', path: '/orders', icon: 'orders', module: 'user_orders', action: 'view', key: 'dbsorders' },
      { label: 'DBS Payments', path: '/my-payments', icon: 'creditcard', module: 'user_payments', action: 'view', key: 'dbspayments' },
      { label: 'My Wallet', path: '/marketers/wallet', icon: 'wallet', module: 'marketer_wallet', action: 'view', key: 'wallet' },
      { label: 'Settings', path: '/settings', icon: 'settings', module: 'settings', action: 'view', key: 'settings' },
    ],
  },
]

function MenuLink({ item, onClick }: { item: MenuItem; onClick?: () => void }) {
  const location = useLocation()
  const isActive = Boolean(item.path) && location.pathname === item.path
  const hasChildren = Boolean(item.children?.length)
  const IconComponent = icons[item.icon]

  if (hasChildren) {
    const isSectionActive = item.children?.some(child => child.path === location.pathname)

    return (
      <li>
        <details open={isSectionActive}>
          <summary>
            {IconComponent && <IconComponent className="w-5 h-5" />}
            {item.label}
          </summary>
          <ul>
            {item.children?.map((child) => (
              <MenuLink key={child.key || child.path || child.label} item={child} onClick={onClick} />
            ))}
          </ul>
        </details>
      </li>
    )
  }

  if (!item.path) {
    return null
  }

  return (
    <li>
      <Link to={item.path} className={clsx(isActive && 'active')} onClick={onClick}>
        {IconComponent && <IconComponent className="w-5 h-5" />}
        {!IconComponent && <span>{item.icon}</span>}
        {item.label}
      </Link>
    </li>
  )
}

interface SidebarProps {
  collapsed?: boolean
  onLinkClick?: () => void
}

export function Sidebar({ collapsed = false, onLinkClick }: SidebarProps) {
  const { canView, isAuthenticated, isAdmin } = usePermissions()

  // Define which menu items are for users only (to exclude for non-admins)
  const adminOnlyModules = new Set(['users', 'roles', 'marketers', 'content', 'orders', 'payments', 'settings'])

  const hasPermissionForItem = (item: MenuItem): boolean => {
    if (item.module === 'dashboard') {
      return isAuthenticated
    }

    if (isAdmin) {
      return true
    }

    if (item.module && adminOnlyModules.has(item.module)) {
      return false
    }

    if (item.module && item.action) {
      return canView(item.module)
    }

    return true
  }

  const menu: MenuItem[] = menuConfig
    .map((item) => {
      if (item.children?.length) {
        const visibleChildren = item.children.filter(hasPermissionForItem)
        if (visibleChildren.length === 0) return null
        return { ...item, children: visibleChildren }
      }

      return hasPermissionForItem(item) ? item : null
    })
    .filter((item): item is MenuItem => Boolean(item))

  if (menu.length === 0) return null

  return (
    <aside className={clsx('bg-base-200 min-h-screen h-full overflow-y-auto', collapsed ? 'w-16' : 'w-64')}>
      <div className="p-4">
        <h2 className="text-lg font-bold px-2">
          {collapsed ? '' : 'Menu'}
        </h2>
      </div>
  <ul className="menu p-2">
        {menu.map((item) => (
          <MenuLink key={item.key || item.path || item.label} item={item} onClick={onLinkClick} />
        ))}
      </ul>
    </aside>
  )
}
import { useAuth } from '@/store/store'

// Permission hook for component-level permission checking
export const usePermissions = () => {
  const auth = useAuth()

  // Check if user has specific permission
  const hasPermission = (module: string, action: string): boolean => {
    return auth.hasPermission(module, action)
  }

  // Check if user has any of the specified permissions for a module
  const hasAnyPermission = (module: string, actions: string[]): boolean => {
    return auth.hasAnyPermission(module, actions)
  }

  // Convenience methods for common actions
  const canView = (module: string): boolean => auth.canView(module)
  const canAdd = (module: string): boolean => auth.canAdd(module)
  const canEdit = (module: string): boolean => auth.canEdit(module)
  const canDelete = (module: string): boolean => auth.canDelete(module)

  // Get all permissions for a specific module
  const getModulePermissions = (module: string): string[] => {
    return auth.permissions[module] || []
  }

  // Check if user has all specified permissions for a module
  const hasAllPermissions = (module: string, actions: string[]): boolean => {
    const modulePermissions = auth.permissions[module] || []
    return actions.every(action => modulePermissions.includes(action))
  }

  // Get custom permissions (with expiration info)
  const getCustomPermissions = () => {
    return auth.customPermissions
  }

  // Check if user has any custom permissions for a module
  const hasCustomPermissions = (module: string): boolean => {
    return auth.customPermissions.some(cp => cp.module_code === module)
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canView,
    canAdd,
    canEdit,
    canDelete,
    getModulePermissions,
    getCustomPermissions,
    hasCustomPermissions,
    // Expose auth state for convenience
    permissions: auth.permissions,
    customPermissions: auth.customPermissions,
    isAuthenticated: auth.isAuthenticated,
    userRole: auth.userRole,
    isAdmin: auth.isAdmin,
    isSuperAdmin: auth.isSuperAdmin,
  }
}
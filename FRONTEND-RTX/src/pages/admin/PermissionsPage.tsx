import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, Save, ArrowLeft } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/store/store'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'

interface PermissionModule {
  module_id: number
  module_name: string
  module_code: string
  description: string | null
  category: string | null
  sort_order: number
  is_active: boolean
}

interface PermissionAction {
  action_id: number
  action_name: string
  action_code: string
  description: string | null
}

interface RolePermission {
  role_id: number
  module_id: number
  action_id: number
  is_granted: boolean
  permission_modules: PermissionModule
  permission_actions: PermissionAction
}

function usePermissionModules() {
  return useQuery({
    queryKey: ['permission-modules'],
    queryFn: async () => {
      const res = await api.get('permission_modules/index')
      return res.data.records as PermissionModule[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

function usePermissionActions() {
  return useQuery({
    queryKey: ['permission-actions'],
    queryFn: async () => {
      const res = await api.get('permission_actions/index')
      return res.data.records as PermissionAction[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

function useRolePermissions(roleId: number) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      const res = await api.get(`roles/permissions/${roleId}`)
      return res.data as RolePermission[]
    },
    enabled: !!roleId,
    staleTime: 30 * 1000,
  })
}

function useUserPermissions(userId: number) {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      const res = await api.get(`users/permissions/${userId}`)
      return res.data
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

function RolePermissionsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const roleId = parseInt(id || '0')
  const { data: modules } = usePermissionModules()
  const { data: actions } = usePermissionActions()
  const { data: rolePermissions, isLoading } = useRolePermissions(roleId)
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const [grantedPermissions, setGrantedPermissions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (rolePermissions) {
      const initial: Record<string, boolean> = {}
      rolePermissions.forEach(p => {
        initial[`${p.module_id}-${p.action_id}`] = p.is_granted
      })
      setGrantedPermissions(initial)
    }
  }, [rolePermissions])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const permissions = []
      for (const [key, value] of Object.entries(grantedPermissions)) {
        const [module_id, action_id] = key.split('-').map(Number)
        permissions.push({ module_id, action_id, is_granted: value })
      }
      await api.post(`roles/permissions/${roleId}`, { permissions })
    },
    onSuccess: () => {
      toast.success('Permissions saved successfully')
      queryClient.invalidateQueries({ queryKey: ['role-permissions', roleId] })
    },
    onError: () => {
      toast.error('Failed to save permissions')
    },
  })

  const togglePermission = (moduleId: number, actionId: number) => {
    setGrantedPermissions(prev => ({
      ...prev,
      [`${moduleId}-${actionId}`]: !prev[`${moduleId}-${actionId}`],
    }))
  }

  const toggleAllForModule = (moduleId: number, granted: boolean) => {
    const newPerms = { ...grantedPermissions }
    actions?.forEach(action => {
      newPerms[`${moduleId}-${action.action_id}`] = granted
    })
    setGrantedPermissions(newPerms)
  }

  const groupedModules = modules?.reduce((acc, mod) => {
    const cat = mod.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(mod)
    return acc
  }, {} as Record<string, PermissionModule[]>) || {}

  const handleSave = async () => {
    setSaving(true)
    await saveMutation.mutateAsync()
    setSaving(false)
  }

  if (!roleId) {
    return <div className="p-4">Role not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/roles')}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold">Role Permissions</h1>
        <button className="btn btn-primary btn-sm ml-auto" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Permissions
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedModules).map(([category, mods]) => (
            <div key={category} className="bg-base-200 rounded-lg p-4">
              <h2 className="font-bold text-lg mb-4">{category}</h2>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-48">Module</th>
                      {actions?.map(action => (
                        <th key={action.action_id} className="text-center">
                          {action.action_name}
                        </th>
                      ))}
                      <th className="text-center">
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => {
                            const allGranted = mods.every(m =>
                              actions?.every(a => grantedPermissions[`${m.module_id}-${a.action_id}`])
                            )
                            mods.forEach(m => toggleAllForModule(m.module_id, !allGranted))
                          }}
                        >
                          All
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mods.map(mod => (
                      <tr key={mod.module_id}>
                        <td>
                          <div className="font-medium">{mod.module_name}</div>
                          <div className="text-xs opacity-60">{mod.module_code}</div>
                        </td>
                        {actions?.map(action => (
                          <td key={action.action_id} className="text-center">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={grantedPermissions[`${mod.module_id}-${action.action_id}`] === true}
                              onChange={() => togglePermission(mod.module_id, action.action_id)}
                            />
                          </td>
                        ))}
                        <td className="text-center">
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => {
                              const allGranted = actions?.every(a =>
                                grantedPermissions[`${mod.module_id}-${a.action_id}`]
                              )
                              toggleAllForModule(mod.module_id, !allGranted)
                            }}
                          >
                            {actions?.every(a => grantedPermissions[`${mod.module_id}-${a.action_id}`])
                              ? 'None'
                              : 'All'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UserPermissionsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const userId = parseInt(id || '0')
  const { data: modules } = usePermissionModules()
  const { data: actions } = usePermissionActions()
  const { data: userData, isLoading } = useUserPermissions(userId)
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({})

  const addPermissionMutation = useMutation({
    mutationFn: async ({ module_id, action_id, is_granted }: { module_id: number; action_id: number; is_granted: boolean }) => {
      await api.post('user_custom_permissions/add', {
        user_id: userId,
        module_id,
        action_id,
        is_granted,
      })
    },
    onSuccess: () => {
      toast.success('Permission added')
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] })
    },
    onError: () => {
      toast.error('Failed to add permission')
    },
  })

  const deletePermissionMutation = useMutation({
    mutationFn: async (permissionId: number) => {
      await api.get(`user_custom_permissions/delete/${permissionId}`)
    },
    onSuccess: () => {
      toast.success('Permission removed')
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] })
    },
    onError: () => {
      toast.error('Failed to remove permission')
    },
  })

  const togglePermission = async (moduleId: number, actionId: number, currentlyGranted: boolean | undefined) => {
    const existingPerm = userData?.customPermissions?.find(
      p => p.module_id === moduleId && p.action_id === actionId
    )

    if (existingPerm) {
      await deletePermissionMutation.mutateAsync(existingPerm.id)
    } else {
      await addPermissionMutation.mutateAsync({
        module_id: moduleId,
        action_id: actionId,
        is_granted: !currentlyGranted,
      })
    }
  }

  const groupedModules = modules?.reduce((acc, mod) => {
    const cat = mod.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(mod)
    return acc
  }, {} as Record<string, PermissionModule[]>) || {}

  const isPermissionGranted = (moduleId: number, actionId: number): boolean | undefined => {
    const customPerm = userData?.customPermissions?.find(
      p => p.module_id === moduleId && p.action_id === actionId
    )
    return customPerm?.is_granted
  }

  if (!userId) {
    return <div className="p-4">User not found</div>
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold">User Permissions</h1>
      </div>

      <div className="bg-base-200 rounded-lg p-4">
        <h2 className="font-bold">{userData?.user?.name}</h2>
        <p className="opacity-60">{userData?.user?.email}</p>
        {userData?.role && (
          <div className="mt-2">
            <span className="badge badge-primary">Role: {userData.role.role_name}</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(groupedModules).map(([category, mods]) => (
          <div key={category} className="bg-base-200 rounded-lg p-4">
            <h2 className="font-bold text-lg mb-4">{category}</h2>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-48">Module</th>
                    {actions?.map(action => (
                      <th key={action.action_id} className="text-center">
                        {action.action_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mods.map(mod => (
                    <tr key={mod.module_id}>
                      <td>
                        <div className="font-medium">{mod.module_name}</div>
                        <div className="text-xs opacity-60">{mod.module_code}</div>
                      </td>
                      {actions?.map(action => {
                        const granted = isPermissionGranted(mod.module_id, action.action_id)
                        return (
                          <td key={action.action_id} className="text-center">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={granted === true}
                              onChange={() => togglePermission(mod.module_id, action.action_id, granted)}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PermissionsPage() {
  const location = useLocation()
  const { id } = useParams()
  const { canView } = usePermissions()
  
  // Determine if this is a role or user permission page based on URL path
  const isRolePage = location.pathname.includes('/roles/') || location.pathname.includes('/admin/roles/')
  
  if (!canView('roles')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to manage roles.</p>
      </div>
    )
  }
  
  if (isRolePage) {
    return <RolePermissionsPage />
  }
  
  return <UserPermissionsPage />
}

export default PermissionsPage

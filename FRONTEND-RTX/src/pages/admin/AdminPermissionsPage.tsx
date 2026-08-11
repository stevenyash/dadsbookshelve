import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save, Shield, Users, X, Trash2, Plus, Edit, Layers, Zap } from 'lucide-react'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'

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

interface Role {
  role_id: number
  role_name: string
  role_code: string
  description: string | null
  is_system: boolean
  is_active: boolean
}

interface RolePermission {
  role_id: number
  module_id: number
  action_id: number
  is_granted: boolean
  permission_modules: PermissionModule
  permission_actions: PermissionAction
}

interface CustomPermission {
  id: number
  user_id: number
  module_id: number
  action_id: number
  is_granted: boolean
  granted_at: string
  expires_at: string | null
  permission_modules: PermissionModule
  permission_actions: PermissionAction
  granted_by_user?: { name: string }
}

interface User {
  user_id: number
  name: string
  email: string
  role_name?: string
  role_code?: string
}

function useAllPermissionModules() {
  return useQuery({
    queryKey: ['permission-modules-all'],
    queryFn: async () => {
      // Fetch first 200 modules (should cover all)
      const res = await api.get('permission_modules/index?limit=200')
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

function useRoles() {
  return useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await api.get('roles')
      return res.data.records as Role[]
    },
    staleTime: 30 * 1000,
  })
}

function useRolePermissions(roleId: number) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      const res = await api.get(`roles/permissions/${roleId}`)
      return res.data.records as RolePermission[]
    },
    enabled: !!roleId,
    staleTime: 30 * 1000,
  })
}

function useUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('users?limit=1000')
      return res.data.records as User[]
    },
    staleTime: 30 * 1000,
  })
}

function useUserCustomPermissions(userId: number) {
  return useQuery({
    queryKey: ['user-custom-permissions', userId],
    queryFn: async () => {
      const res = await api.get(`user_custom_permissions/user/${userId}`)
      return res.data as CustomPermission[]
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

function RolePermissionsTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedRoleId = searchParams.get('role')
  const { data: roles } = useRoles()
  const { data: modulesData } = useAllPermissionModules()
  const modules = modulesData?.records || modulesData || []
  const { data: actions } = usePermissionActions()
  const roleId = selectedRoleId ? parseInt(selectedRoleId) : roles?.[0]?.role_id
  const { data: rolePermissions, isLoading } = useRolePermissions(roleId || 0)
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
      toast.success('Role permissions saved successfully')
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <select
          className="select select-bordered"
          value={selectedRoleId || roles?.[0]?.role_id || ''}
          onChange={(e) => setSearchParams({ role: e.target.value })}
        >
          {roles?.map(role => (
            <option key={role.role_id} value={role.role_id}>
              {role.role_name} {role.is_system && '(System)'}
            </option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
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
                <table className="table table-xs">
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
                              className="checkbox checkbox-xs"
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
              {/* Page info */}
              <div className="text-sm text-base-content/70 mt-2">
                Showing {groupedModules ? Object.values(groupedModules).flat().length : 0} modules
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AddCustomPermissionModal({
  userId,
  onClose,
  onSuccess
}: {
  userId: number
  onClose: () => void
  onSuccess: () => void
}) {
  const { data: modules } = useAllPermissionModules()
  const { data: actions } = usePermissionActions()
  const [formData, setFormData] = useState({
    module_id: '',
    action_id: '',
    is_granted: true,
    expires_at: '',
  })
  const [saving, setSaving] = useState(false)

  const groupedModules = modules?.reduce((acc, mod) => {
    const cat = mod.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(mod)
    return acc
  }, {} as Record<string, PermissionModule[]>) || {}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('user_custom_permissions/add', {
        user_id: userId,
        module_id: parseInt(formData.module_id),
        action_id: parseInt(formData.action_id),
        is_granted: formData.is_granted,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      })
      toast.success('Custom permission added')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add permission')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
          <X />
        </button>
        <h3 className="font-bold text-lg mb-4">Add Custom Permission</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Module</span></label>
              <select
                className="select select-bordered"
                value={formData.module_id}
                onChange={e => setFormData({ ...formData, module_id: e.target.value, action_id: '' })}
                required
              >
                <option value="">Select module</option>
                {Object.entries(groupedModules).map(([category, mods]) => (
                  <optgroup key={category} label={category}>
                    {mods.map(mod => (
                      <option key={mod.module_id} value={mod.module_id}>{mod.module_name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Action</span></label>
              <select
                className="select select-bordered"
                value={formData.action_id}
                onChange={e => setFormData({ ...formData, action_id: e.target.value })}
                required
                disabled={!formData.module_id}
              >
                <option value="">Select action</option>
                {actions?.map(action => (
                  <option key={action.action_id} value={action.action_id}>{action.action_name}</option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Grant Permission</span>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={formData.is_granted}
                  onChange={e => setFormData({ ...formData, is_granted: e.target.checked })}
                />
              </label>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Expires At (optional)</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered"
                value={formData.expires_at}
                onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
              />
              <label className="label">
                <span className="label-text-alt">Leave empty for permanent permission</span>
              </label>
            </div>
          </div>
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add Permission
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}

function UserCustomPermissionsTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedUserId = searchParams.get('user')
  const { data: users } = useUsers()
  const { data: modules } = usePermissionModules()

  const userId = selectedUserId ? parseInt(selectedUserId) : users?.[0]?.user_id
  const { data: customPermissions, isLoading } = useUserCustomPermissions(userId || 0)
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.get(`user_custom_permissions/delete/${id}`)
    },
    onSuccess: () => {
      toast.success('Permission removed')
      queryClient.invalidateQueries({ queryKey: ['user-custom-permissions', userId] })
    },
    onError: () => {
      toast.error('Failed to remove permission')
    },
  })

  const selectedUser = users?.find(u => u.user_id === userId)

  const groupedModules = modules?.reduce((acc, mod) => {
    const cat = mod.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(mod)
    return acc
  }, {} as Record<string, PermissionModule[]>) || {}

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <select
          className="select select-bordered"
          value={selectedUserId || users?.[0]?.user_id || ''}
          onChange={(e) => setSearchParams({ user: e.target.value })}
        >
          {users?.map(user => (
            <option key={user.user_id} value={user.user_id}>
              {user.name} ({user.email})
            </option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          Add Custom Permission
        </button>
      </div>

      {selectedUser && (
        <div className="bg-base-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="font-bold">{selectedUser.name}</div>
              <div className="text-sm opacity-60">{selectedUser.email}</div>
            </div>
            {selectedUser.role_name && (
              <span className="badge badge-primary">Role: {selectedUser.role_name}</span>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : customPermissions && customPermissions.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedModules).map(([category, mods]) => {
            const categoryPerms = customPermissions.filter(p => 
              mods.some(m => m.module_id === p.module_id)
            )
            if (categoryPerms.length === 0) return null
            
            return (
              <div key={category} className="bg-base-200 rounded-lg p-4">
                <h2 className="font-bold text-lg mb-4">{category}</h2>
                <div className="overflow-x-auto">
                  <table className="table table-xs">
                    <thead>
                      <tr>
                        <th className="w-48">Module</th>
                        <th>Action</th>
                        <th>Status</th>
                        <th>Granted</th>
                        <th>Expires</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryPerms.map(perm => (
                        <tr key={perm.id}>
                          <td>
                            <div className="font-medium">{perm.permission_modules.module_name}</div>
                            <div className="text-xs opacity-60">{perm.permission_modules.module_code}</div>
                          </td>
                          <td>{perm.permission_actions.action_name}</td>
                          <td>
                            <span className={`badge ${perm.is_granted ? 'badge-success' : 'badge-error'}`}>
                              {perm.is_granted ? 'Granted' : 'Denied'}
                            </span>
                          </td>
                          <td className="text-sm">
                            {new Date(perm.granted_at).toLocaleDateString()}
                          </td>
                          <td className="text-sm">
                            {perm.expires_at ? (
                              new Date(perm.expires_at) < new Date() ? (
                                <span className="text-error">Expired</span>
                              ) : (
                                new Date(perm.expires_at).toLocaleDateString()
                              )
                            ) : (
                              <span className="opacity-60">Never</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-xs btn-ghost text-error"
                              onClick={() => {
                                if (confirm('Remove this permission?')) {
                                  deleteMutation.mutate(perm.id)
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 opacity-60">
          No custom permissions set for this user.
        </div>
      )}

      {showAddModal && userId && (
        <AddCustomPermissionModal
          userId={userId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['user-custom-permissions', userId] })
          }}
        />
      )}
    </div>
  )
}

function AddModuleModal({
  module,
  onClose,
  onSuccess
}: {
  module?: PermissionModule
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    module_name: module?.module_name || '',
    module_code: module?.module_code || '',
    description: module?.description || '',
    category: module?.category || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (module?.module_id) {
        await api.put(`permission_modules/edit/${module.module_id}`, formData)
        toast.success('Module updated')
      } else {
        await api.post('permission_modules/add', formData)
        toast.success('Module added')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save module')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
          <X />
        </button>
        <h3 className="font-bold text-lg mb-4">{module ? 'Edit Module' : 'Add New Module'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Module Name</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.module_name}
                onChange={e => setFormData({ ...formData, module_name: e.target.value })}
                placeholder="e.g., Book Management"
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Module Code</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.module_code}
                onChange={e => setFormData({ ...formData, module_code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                placeholder="e.g., books"
                required
              />
              <label className="label"><span className="label-text-alt">Used in canView('books'), canEdit('books'), etc.</span></label>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Category (optional)</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Content, Users, Settings"
              />
              <label className="label"><span className="label-text-alt">Group modules by category in the UI</span></label>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Description</span></label>
              <textarea
                className="textarea textarea-bordered"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this module for?"
              />
            </div>
          </div>
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {module ? 'Update' : 'Add Module'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}

function ModulesTab() {
  const { data: modules, isLoading } = useAllPermissionModules()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingModule, setEditingModule] = useState<PermissionModule | undefined>()

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`permission_modules/delete/${id}`)
    },
    onSuccess: () => {
      toast.success('Module deleted')
      queryClient.invalidateQueries({ queryKey: ['permission-modules-all'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Cannot delete module with permissions')
    },
  })

  const groupedModules = modules?.reduce((acc, mod) => {
    const cat = mod.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(mod)
    return acc
  }, {} as Record<string, PermissionModule[]>) || {}

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Module
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
              <div className="grid gap-2">
                {mods.map(mod => (
                  <div key={mod.module_id} className="flex items-center justify-between bg-base-100 p-3 rounded">
                    <div>
                      <div className="font-medium">{mod.module_name}</div>
                      <div className="text-xs opacity-60">{mod.module_code}</div>
                      {mod.description && (
                        <div className="text-sm opacity-60 mt-1">{mod.description}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => setEditingModule(mod)}
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => {
                          if (confirm('Delete this module?')) {
                            deleteMutation.mutate(mod.module_id)
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddModuleModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['permission-modules-all'] })}
        />
      )}
      {editingModule && (
        <AddModuleModal
          module={editingModule}
          onClose={() => setEditingModule(undefined)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['permission-modules-all'] })}
        />
      )}
    </div>
  )
}

function AddActionModal({
  action,
  onClose,
  onSuccess
}: {
  action?: PermissionAction
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    action_name: action?.action_name || '',
    action_code: action?.action_code || '',
    description: action?.description || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (action?.action_id) {
        await api.put(`permission_actions/edit/${action.action_id}`, formData)
        toast.success('Action updated')
      } else {
        await api.post('permission_actions/add', formData)
        toast.success('Action added')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save action')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
          <X />
        </button>
        <h3 className="font-bold text-lg mb-4">{action ? 'Edit Action' : 'Add New Action'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Action Name</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.action_name}
                onChange={e => setFormData({ ...formData, action_name: e.target.value })}
                placeholder="e.g., View"
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Action Code</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.action_code}
                onChange={e => setFormData({ ...formData, action_code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                placeholder="e.g., view"
                required
              />
              <label className="label"><span className="label-text-alt">Used in hasPermission('module', 'view')</span></label>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Description</span></label>
              <textarea
                className="textarea textarea-bordered"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this action allow?"
              />
            </div>
          </div>
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {action ? 'Update' : 'Add Action'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}

function ActionsTab() {
  const { data: actions, isLoading } = usePermissionActions()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAction, setEditingAction] = useState<PermissionAction | undefined>()

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`permission_actions/delete/${id}`)
    },
    onSuccess: () => {
      toast.success('Action deleted')
      queryClient.invalidateQueries({ queryKey: ['permission-actions'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Cannot delete action with permissions')
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Action
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="bg-base-200 rounded-lg p-4">
          <table className="table">
            <thead>
              <tr>
                <th>Action Name</th>
                <th>Code</th>
                <th>Description</th>
                <th className="w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {actions?.map(action => (
                <tr key={action.action_id}>
                  <td className="font-medium">{action.action_name}</td>
                  <td><code className="bg-base-100 px-2 py-1 rounded">{action.action_code}</code></td>
                  <td className="opacity-70">{action.description || '-'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => setEditingAction(action)}
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => {
                          if (confirm('Delete this action?')) {
                            deleteMutation.mutate(action.action_id)
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddActionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['permission-actions'] })}
        />
      )}
      {editingAction && (
        <AddActionModal
          action={editingAction}
          onClose={() => setEditingAction(undefined)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['permission-actions'] })}
        />
      )}
    </div>
  )
}

export function AdminPermissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'modules'
  const { canView, canEdit } = usePermissions()
  const navigate = useNavigate()

  if (!canView('roles') && !canView('users')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to manage permissions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold">Permission Management</h1>
      </div>

      <div className="tabs tabs-boxed">
        <button
          className={`tab ${activeTab === 'modules' ? 'tab-active' : ''}`}
          onClick={() => setSearchParams({ tab: 'modules' })}
        >
          <Layers className="w-4 h-4 mr-2" />
          Modules
        </button>
        <button
          className={`tab ${activeTab === 'actions' ? 'tab-active' : ''}`}
          onClick={() => setSearchParams({ tab: 'actions' })}
        >
          <Zap className="w-4 h-4 mr-2" />
          Actions
        </button>
        <button
          className={`tab ${activeTab === 'roles' ? 'tab-active' : ''}`}
          onClick={() => setSearchParams({ tab: 'roles' })}
        >
          <Shield className="w-4 h-4 mr-2" />
          Role Permissions
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'tab-active' : ''}`}
          onClick={() => setSearchParams({ tab: 'users' })}
        >
          <Users className="w-4 h-4 mr-2" />
          User Custom
        </button>
      </div>

      {activeTab === 'modules' && <ModulesTab />}
      {activeTab === 'actions' && <ActionsTab />}
      {activeTab === 'roles' && <RolePermissionsTab />}
      {activeTab === 'users' && <UserCustomPermissionsTab />}
    </div>
  )
}

export default AdminPermissionsPage
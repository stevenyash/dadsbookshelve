import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, X, Calendar, User, Shield } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import api from '@/lib/api'

interface Permission {
  module_code: string
  module_name: string
  action_code: string
  action_name: string
  is_granted: boolean
  expires_at: string | null
  granted_by: number
}

interface User {
  user_id: number
  name: string
  email: string
}

interface PermissionModule {
  module_id: number
  module_code: string
  module_name: string
}

interface PermissionAction {
  action_id: number
  action_code: string
  action_name: string
}

interface CustomPermissionForm {
  module_id: number
  action_id: number
  is_granted: boolean
  expires_at: string | null
}

export function PermissionManagement({ userId }: { userId: number }) {
  const { canEdit } = usePermissions()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<CustomPermissionForm>({
    module_id: 0,
    action_id: 0,
    is_granted: true,
    expires_at: null,
  })

  const queryClient = useQueryClient()

  // Fetch user details
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get(`users/view/${userId}`).then(res => res.data),
  })

  // Fetch custom permissions
  const { data: customPermissions, isLoading } = useQuery({
    queryKey: ['user-custom-permissions', userId],
    queryFn: () => api.get(`user-custom-permissions/user/${userId}`).then(res => res.data),
  })

  // Fetch permission modules
  const { data: modules } = useQuery({
    queryKey: ['permission-modules'],
    queryFn: () => api.get('permission-modules/index').then(res => res.data.records),
  })

  // Fetch permission actions
  const { data: actions } = useQuery({
    queryKey: ['permission-actions'],
    queryFn: () => api.get('permission-actions/index').then(res => res.data.records),
  })

  // Add custom permission
  const addPermissionMutation = useMutation({
    mutationFn: (data: any) => api.post('user-custom-permissions/add', { ...data, user_id: userId }),
    onSuccess: () => {
      toast.success('Permission granted successfully')
      queryClient.invalidateQueries({ queryKey: ['user-custom-permissions', userId] })
      setShowAddForm(false)
      setFormData({ module_id: 0, action_id: 0, is_granted: true, expires_at: null })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to grant permission')
    },
  })

  // Remove custom permission
  const removePermissionMutation = useMutation({
    mutationFn: (permissionId: number) => api.get(`user-custom-permissions/delete/${permissionId}`),
    onSuccess: () => {
      toast.success('Permission revoked successfully')
      queryClient.invalidateQueries({ queryKey: ['user-custom-permissions', userId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revoke permission')
    },
  })

  const handleAddPermission = () => {
    if (!formData.module_id || !formData.action_id) {
      toast.error('Please select both module and action')
      return
    }
    addPermissionMutation.mutate(formData)
  }

  const handleRemovePermission = (permission: Permission & { id: number }) => {
    if (confirm(`Revoke ${permission.action_name} permission for ${permission.module_name}?`)) {
      removePermissionMutation.mutate(permission.id)
    }
  }

  if (!canEdit('users')) {
    return (
      <div className="text-center py-8">
        <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to manage user permissions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Permission Management</h2>
          {user && (
            <p className="text-sm text-gray-600">
              Managing permissions for: <span className="font-medium">{user.name} ({user.email})</span>
            </p>
          )}
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Grant Permission
        </button>
      </div>

      {/* Add Permission Form */}
      {showAddForm && (
        <div className="bg-base-200 p-4 rounded-lg">
          <h3 className="font-semibold mb-4">Grant Custom Permission</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Module</span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={formData.module_id}
                onChange={(e) => setFormData({ ...formData, module_id: parseInt(e.target.value) })}
              >
                <option value={0}>Select Module</option>
                {modules?.map((module: PermissionModule) => (
                  <option key={module.module_id} value={module.module_id}>
                    {module.module_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Action</span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={formData.action_id}
                onChange={(e) => setFormData({ ...formData, action_id: parseInt(e.target.value) })}
              >
                <option value={0}>Select Action</option>
                {actions?.map((action: PermissionAction) => (
                  <option key={action.action_id} value={action.action_id}>
                    {action.action_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Permission</span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={formData.is_granted ? 'grant' : 'deny'}
                onChange={(e) => setFormData({ ...formData, is_granted: e.target.value === 'grant' })}
              >
                <option value="grant">Grant</option>
                <option value="deny">Deny</option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Expires At (Optional)</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered input-sm w-full"
                value={formData.expires_at || ''}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value || null })}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddPermission}
              disabled={addPermissionMutation.isPending}
            >
              {addPermissionMutation.isPending ? 'Granting...' : 'Grant Permission'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current Custom Permissions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Custom Permissions</h3>
        {isLoading ? (
          <div className="text-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : customPermissions?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No custom permissions granted</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {customPermissions?.map((permission: Permission & { id: number }) => (
              <div key={permission.id} className="bg-base-100 p-4 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">
                        {permission.module_name} - {permission.action_name}
                      </span>
                      <span className={`badge badge-sm ${permission.is_granted ? 'badge-success' : 'badge-error'}`}>
                        {permission.is_granted ? 'Granted' : 'Denied'}
                      </span>
                    </div>
                    {permission.expires_at && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-3 h-3" />
                        Expires: {new Date(permission.expires_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => handleRemovePermission(permission)}
                    title="Revoke Permission"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
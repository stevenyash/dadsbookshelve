import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Loader2, Shield } from 'lucide-react'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'

interface Role {
  role_id: number
  role_name: string
  role_code: string
  description: string | null
  parent_role_id: number | null
  is_system: boolean
  is_active: boolean
  sort_order: number
  date_created: string | null
  role_permissions?: {
    permission_modules: { module_name: string; module_code: string }
    permission_actions: { action_name: string; action_code: string }
    is_granted: boolean
  }[]
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

function AddRoleModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    role_name: '',
    role_code: '',
    description: '',
    is_active: true,
    sort_order: 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.post('roles/add', data)
    },
    onSuccess: () => {
      toast.success('Role created successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      onClose()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create role')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    mutation.mutate(formData)
    setSaving(false)
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
          <X />
        </button>
        <h3 className="font-bold text-lg mb-4">Add New Role</h3>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Role Name</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.role_name}
                onChange={e => setFormData({ ...formData, role_name: e.target.value })}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Role Code</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.role_code}
                onChange={e => setFormData({ ...formData, role_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., editor, moderator"
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Description</span></label>
              <textarea
                className="textarea textarea-bordered"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Active</span>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                />
              </label>
            </div>
          </div>
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}

function EditRoleModal({ role, onClose }: { role: Role; onClose: () => void }) {
  const [formData, setFormData] = useState({
    role_name: role.role_name,
    role_code: role.role_code,
    description: role.description || '',
    is_active: role.is_active,
    sort_order: role.sort_order || 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.post(`roles/edit/${role.role_id}`, data)
    },
    onSuccess: () => {
      toast.success('Role updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      onClose()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to update role')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    mutation.mutate(formData)
    setSaving(false)
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
          <X />
        </button>
        <h3 className="font-bold text-lg mb-4">Edit Role</h3>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Role Name</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.role_name}
                onChange={e => setFormData({ ...formData, role_name: e.target.value })}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Role Code</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.role_code}
                onChange={e => setFormData({ ...formData, role_code: e.target.value })}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Description</span></label>
              <textarea
                className="textarea textarea-bordered"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Active</span>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                />
              </label>
            </div>
          </div>
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}

export function RolesPage() {
  const { canView, canAdd, canEdit, canDelete } = usePermissions()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const { data: roles, isLoading } = useRoles()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.get(`roles/delete/${id}`)
    },
    onSuccess: () => {
      toast.success('Role deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
    },
  })

  if (!canView('roles')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to manage roles.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Role Management</h1>
        {canAdd('roles') && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Role
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles?.map(role => (
            <div key={role.role_id} className="card bg-base-200 shadow">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="card-title">
                      {role.role_name}
                      {role.is_system && <span className="badge badge-xs badge-primary">System</span>}
                    </h2>
                    <p className="text-sm opacity-60 font-mono">{role.role_code}</p>
                  </div>
                  <span className={`badge ${role.is_active ? 'badge-success' : 'badge-error'}`}>
                    {role.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {role.description && (
                  <p className="text-sm opacity-70 mt-2">{role.description}</p>
                )}
                <div className="card-actions justify-end mt-4">
                  {canEdit('roles') && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditRole(role)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete('roles') && !role.is_system && (
                    <button
                      className="btn btn-ghost btn-sm text-error"
                      onClick={() => {
                        if (confirm('Delete this role?')) {
                          deleteMutation.mutate(role.role_id)
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    to={`/admin/roles/${role.role_id}/permissions`}
                    className="btn btn-ghost btn-sm"
                  >
                    <Shield className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(!roles || roles.length === 0) && !isLoading && (
        <div className="text-center py-12 opacity-60">
          No roles found. Create your first role.
        </div>
      )}

      {showAddModal && (
        <AddRoleModal onClose={() => setShowAddModal(false)} />
      )}

      {editRole && (
        <EditRoleModal role={editRole} onClose={() => setEditRole(null)} />
      )}
    </div>
  )
}

export default RolesPage

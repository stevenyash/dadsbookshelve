import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, UserX, UserCheck, Shield, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'

interface User {
  user_id: number
  name: string
  email: string
  telephone: string
  user_role_id: number | null
  account_status: string
  date_created: string | null
  roles?: { role_name: string; role_code: string } | null
}

interface Role {
  role_id: number
  role_name: string
  role_code: string
  description: string | null
  is_active: boolean
}

interface UsersResponse {
  records: User[]
  page: number
  limit: number
  total: number
  totalPages: number
}

function useRoles() {
  return useQuery({
    queryKey: ['roles-list'],
    queryFn: async () => {
      const res = await api.get('users/roles-list')
      return res.data.records as Role[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

function useUsers(search = '', page = 1) {
  return useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('limit', '20')
      params.append('page', page.toString())
      const res = await api.get(`users?${params.toString()}`)
      return res.data as UsersResponse
    },
    staleTime: 30 * 1000,
  })
}

function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { data: roles } = useRoles()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    telephone: '',
    user_role_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('users/add', formData)
      toast.success('User created successfully')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user')
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
        <h3 className="font-bold text-lg mb-4">Add New User</h3>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Name</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Email</span></label>
              <input
                type="email"
                className="input input-bordered"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Password</span></label>
              <input
                type="password"
                className="input input-bordered"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Phone</span></label>
              <input
                type="tel"
                className="input input-bordered"
                value={formData.telephone}
                onChange={e => setFormData({ ...formData, telephone: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Role</span></label>
              <select
                className="select select-bordered"
                value={formData.user_role_id}
                onChange={e => setFormData({ ...formData, user_role_id: e.target.value })}
                required
              >
                <option value="">Select Role</option>
                {roles?.map(role => (
                  <option key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { data: roles } = useRoles()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: user.name,
    telephone: user.telephone || '',
    user_role_id: user.user_role_id?.toString() || '',
    account_status: user.account_status,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.put(`users/edit/${user.user_id}`, data)
    },
    onSuccess: () => {
      toast.success('User updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      onClose()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to update user')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    updateMutation.mutate(formData)
    setSaving(false)
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
          <X />
        </button>
        <h3 className="font-bold text-lg mb-4">Edit User</h3>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Name</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Phone</span></label>
              <input
                type="tel"
                className="input input-bordered"
                value={formData.telephone}
                onChange={e => setFormData({ ...formData, telephone: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Role</span></label>
              <select
                className="select select-bordered"
                value={formData.user_role_id}
                onChange={e => setFormData({ ...formData, user_role_id: e.target.value })}
              >
                <option value="">Select Role</option>
                {roles?.map(role => (
                  <option key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Status</span></label>
              <select
                className="select select-bordered"
                value={formData.account_status}
                onChange={e => setFormData({ ...formData, account_status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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

export function UsersPage() {
  const { canView, canAdd, canEdit, canDelete } = usePermissions()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const { data: usersResponse, isLoading } = useUsers(search, page)
  const { data: roles } = useRoles()
  
  const users = usersResponse?.records || []
  const totalPages = usersResponse?.totalPages || 0
  const queryClient = useQueryClient()

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`users/deactivate/${id}`)
    },
    onSuccess: () => {
      toast.success('User deactivated')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`users/reactivate/${id}`)
    },
    onSuccess: () => {
      toast.success('User reactivated')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await api.post('users/batch-delete', { ids })
    },
    onSuccess: () => {
      toast.success('Users deleted')
      setSelectedUsers([])
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Delete failed'
      toast.error(msg)
    },
  })

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
      await api.post(`users/assign-role/${userId}`, { role_id: roleId })
    },
    onSuccess: () => {
      toast.success('Role assigned')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const getRoleName = (user: User) => {
    if (user.roles?.role_name) return user.roles.role_name
    if (!user.user_role_id) return 'No Role'
    const role = roles?.find(r => r.role_id === user.user_role_id)
    return role?.role_name || 'Unknown'
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === users?.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users?.map(u => u.user_id) || [])
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  if (!canView('users')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        {canAdd('users') && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </button>
        )}
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search users by name, email, phone..."
            className="input input-bordered w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {selectedUsers.length > 0 && (
          <div className="flex gap-2">
            <button
              className="btn btn-error btn-outline"
              onClick={() => {
                if (confirm(`Delete ${selectedUsers.length} user(s)?`)) {
                  deleteMutation.mutate(selectedUsers)
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedUsers.length})
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users?.map(user => (
            <div key={user.user_id} className={`card bg-base-100 shadow-sm border border-base-200 ${user.account_status === 'inactive' ? 'opacity-60' : ''}`}>
              <div className="card-body p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold truncate">{user.name}</h3>
                    <p className="text-sm opacity-70 truncate">{user.email}</p>
                    <p className="text-xs opacity-50">{user.telephone || '-'}</p>
                  </div>
                  <span className={`badge badge-sm ${user.account_status === 'active' ? 'badge-success' : 'badge-error'}`}>
                    {user.account_status}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {canEdit('roles') ? (
                    <select
                      className="select select-xs select-bordered flex-1"
                      value={user.user_role_id || ''}
                      onChange={e => {
                        if (e.target.value) {
                          assignRoleMutation.mutate({
                            userId: user.user_id,
                            roleId: parseInt(e.target.value),
                          })
                        }
                      }}
                    >
                      <option value="">No Role</option>
                      {roles?.map(role => (
                        <option key={role.role_id} value={role.role_id}>
                          {role.role_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="badge badge-ghost badge-sm">{getRoleName(user)}</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs opacity-50">
                    {user.date_created ? new Date(user.date_created).toLocaleDateString() : '-'}
                  </span>
                  <div className="flex gap-1">
                    {canEdit('users') && (
                      <>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => setEditUser(user)}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {user.account_status === 'active' ? (
                          <button
                            className="btn btn-ghost btn-xs text-warning"
                            onClick={() => deactivateMutation.mutate(user.user_id)}
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost btn-xs text-success"
                            onClick={() => reactivateMutation.mutate(user.user_id)}
                          >
                            <UserCheck className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                    {canDelete('users') && (
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => {
                          if (confirm('Delete this user?')) {
                            deleteMutation.mutate([user.user_id])
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    <Link
                      to={`/admin/users/${user.user_id}/permissions`}
                      className="btn btn-ghost btn-xs"
                    >
                      <Shield className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages >= 1 && !isLoading && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      {(!users || users.length === 0) && !isLoading && (
        <div className="text-center py-12 opacity-60">
          No users found
        </div>
      )}

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
        />
      )}
    </div>
  )
}

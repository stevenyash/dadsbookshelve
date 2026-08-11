import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { marketerApi } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'

interface MarketerFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  mpesaPhone: string
}

export function MarketerAddPage() {
  const navigate = useNavigate()
  const { canAdd, isAdmin } = usePermissions()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState<MarketerFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mpesaPhone: '',
  })

  const createMutation = useMutation({
    mutationFn: (data: MarketerFormData) => marketerApi.adminCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketers'] })
      window.location.href = '/marketers'
    },
    onError: (error: any) => {
      console.error('Marketer creation error:', error)
      alert(error.response?.data?.message || error.message || 'Failed to create marketer')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  if (!canAdd('marketers') && !isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to add marketers.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/marketers" className="btn btn-ghost">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold">Add New Marketer</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl card bg-base-200">
        <div className="card-body space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">First Name *</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Last Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Email *</span>
            </label>
            <input
              type="email"
              className="input input-bordered"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Phone</span>
            </label>
            <input
              type="tel"
              className="input input-bordered"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+254712345678"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">M-Pesa Phone (for payouts)</span>
            </label>
            <input
              type="tel"
              className="input input-bordered"
              value={formData.mpesaPhone}
              onChange={(e) => setFormData({ ...formData, mpesaPhone: e.target.value })}
              placeholder="+254712345678"
            />
          </div>

          <div className="card-actions justify-end">
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Creating...' : 'Create Marketer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export function MarketerEditPage() {
  const { id } = useParams<{ id: string }>()
  const marketerId = parseInt(id || '0')
  const navigate = useNavigate()
  const { canEdit, isAdmin } = usePermissions()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    mpesaPhone: '',
    isActive: true,
    commissionRate: 5,
    tier: 'bronze',
    status: 'active',
  })

  useEffect(() => {
    if (marketerId) {
      marketerApi.get(marketerId).then(res => {
        const m = res.data
        setFormData({
          mpesaPhone: m.mpesaPhone || '',
          isActive: m.isActive,
          commissionRate: m.commissionRate || m.commission_rate || 5,
          tier: m.tier || 'bronze',
          status: m.status || 'active',
        })
      })
    }
  }, [marketerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await marketerApi.update(marketerId, {
        mpesa_phone: formData.mpesaPhone,
        is_active: formData.isActive,
        commission_rate: formData.commissionRate,
        tier: formData.tier,
        status: formData.status,
      })
      queryClient.invalidateQueries({ queryKey: ['marketer', marketerId] })
      window.location.href = `/marketers/view/${marketerId}`
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update marketer')
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit('marketers') && !isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="opacity-70">You don't have permission to edit this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/marketers/view/${marketerId}`} className="btn btn-ghost">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold">Edit Marketer</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl card bg-base-200">
        <div className="card-body space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">M-Pesa Phone</span>
            </label>
            <input
              type="tel"
              className="input input-bordered"
              value={formData.mpesaPhone}
              onChange={(e) => setFormData({ ...formData, mpesaPhone: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span class="label-text">Commission Rate (%)</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              className="input input-bordered"
              value={formData.commissionRate}
              onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span class="label-text">Tier</span>
            </label>
            <select 
              className="select select-bordered"
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
            >
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span class="label-text">Status</span>
            </label>
            <select 
              className="select select-bordered"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Active</span>
              <input
                type="checkbox"
                className="toggle"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            </label>
          </div>

          <div className="card-actions justify-end">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default MarketerAddPage
export { MarketersPage } from './MarketersPage'
export { MarketerViewPage } from './MarketerViewPage'
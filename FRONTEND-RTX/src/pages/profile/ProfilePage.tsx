import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Save, AlertCircle, CheckCircle, Lock, Eye, EyeOff, Shield } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { useAuth } from '@/store/store'
import { authApi } from '@/lib/api'

const COUNTRIES = [
  { code: '+254', name: 'Kenya' },
  { code: '+255', name: 'Tanzania' },
  { code: '+256', name: 'Uganda' },
  { code: '+1', name: 'USA' },
  { code: '+44', name: 'UK' },
  { code: '+91', name: 'India' },
  { code: '+234', name: 'Nigeria' },
  { code: '+20', name: 'Egypt' },
  { code: '+27', name: 'South Africa' },
  { code: '+251', name: 'Ethiopia' },
]

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateProfile, isProfileComplete } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: user?.name || '',
    telephone: user?.telephone || '',
    country_code: user?.country_code || '+254',
    national_id: user?.national_id || '',
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [changingPassword, setChangingPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await updateProfile(formData)
      setSuccess('Profile updated successfully')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match')
      return
    }
    
    if (passwordData.new_password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setChangingPassword(true)
    setError('')

    try {
      await authApi.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      })
      setSuccess('Password changed successfully!')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handlePasswordInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const missingFields = []
  if (!formData.name) missingFields.push('Name')
  if (!formData.telephone) missingFields.push('Phone')
  if (!formData.national_id) missingFields.push('National ID')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-circle">
          ←
        </button>
        <h1 className="text-2xl font-bold">My Profile</h1>
      </div>

      {error && (
        <div className="alert alert-error shadow-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success shadow-lg">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Profile Status */}
      {!isProfileComplete ? (
        <Card className="border-l-4 border-l-warning bg-gradient-to-r from-warning/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="w-5 h-5" />
              Complete Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please fill in the following required fields:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {missingFields.map(field => (
                <span key={field} className="badge badge-warning">{field}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-l-4 border-l-success bg-gradient-to-r from-success/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              Profile Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-success">Your profile is fully completed!</p>
          </CardContent>
        </Card>
      )}

      {/* Personal Information */}
      <Card className="shadow-xl">
        <CardHeader className="border-b border-base-200">
          <CardTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Personal Information</h2>
              <p className="text-sm text-base-content/60">Update your personal details</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                type="email"
                value={user?.email || ''}
                className="input input-bordered bg-base-200"
                disabled
              />
              <label className="label">
                <span className="label-text-alt">Email cannot be changed</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Full Name *</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="input input-bordered focus:input-primary"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">National ID / Passport *</span>
                </label>
                <input
                  type="text"
                  name="national_id"
                  value={formData.national_id}
                  onChange={handleChange}
                  placeholder="Enter national ID or passport"
                  className="input input-bordered focus:input-primary"
                  required
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Phone Number *</span>
              </label>
              <div className="flex gap-2">
                <select
                  name="country_code"
                  value={formData.country_code}
                  onChange={handleChange}
                  className="select select-bordered w-28 focus:select-primary"
                >
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  placeholder="712345678"
                  className="input input-bordered flex-1 focus:input-primary"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="shadow-xl">
        <CardHeader className="border-b border-base-200">
          <CardTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-semibold">Change Password</h2>
              <p className="text-sm text-base-content/60">Update your account password</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Current Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordInput}
                  placeholder="Enter current password"
                  className="input input-bordered w-full pr-10 focus:input-secondary"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">New Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordInput}
                    placeholder="At least 6 characters"
                    className="input input-bordered w-full pr-10 focus:input-secondary"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Confirm New Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordInput}
                    placeholder="Re-enter new password"
                    className="input input-bordered w-full pr-10 focus:input-secondary"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={changingPassword || !passwordData.current_password || !passwordData.new_password}
            >
              {changingPassword ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Change Password
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProfilePage
import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card, CardContent } from '@/components/Card'

interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordFormData>()
  const password = watch('password')

  useEffect(() => {
    if (!token || !email) {
      toast.error('Invalid reset link')
    }
  }, [token, email])

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token || !email) {
      toast.error('Invalid reset link')
      return
    }

    setIsLoading(true)
    try {
      await authApi.resetPassword({
        token,
        email,
        new_password: data.password
      })
      toast.success('Password reset successful')
      navigate('/login')
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to reset password'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-primary/10 p-4 md:p-8">
        <div className="mx-auto w-full max-w-md pt-20 text-center">
          <Link to="/login" className="link link-primary flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
          <div className="mt-8 alert alert-error">
            <span>Invalid or expired reset link</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-primary/10 p-4 md:p-8">
      <div className="mx-auto w-full max-w-md pt-20">
        <Link to="/login" className="link link-primary mb-6 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        
        <Card className="border border-base-300 bg-base-100 shadow-xl">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-1 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Reset password</h2>
              <p className="text-sm text-base-content/70">
                Enter your new password below
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="relative">
                <Input
                  label="New password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  error={errors.password?.message}
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-base-content/50 hover:text-base-content"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              <div className="relative">
                <Input
                  label="Confirm password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword', { 
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-base-content/50 hover:text-base-content"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              <Button type="submit" loading={isLoading} className="w-full">
                Reset password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
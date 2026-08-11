import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/store'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card, CardContent } from '@/components/Card'

interface LoginFormData {
  username: string
  password: string
  referral_code?: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const login = useAuthStore(state => state.login)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<LoginFormData>()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setValue('referral_code', ref)
    }
  }, [searchParams, setValue])

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    setIsLoading(true)
    try {
      await login(data.username, data.password, data.referral_code)
      toast.success('Login successful')
      navigate(redirectTo)
    } catch (err: any) {
      const errorData = err.response?.data
      const msg = errorData?.message || errorData?.error || 'Login failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-primary/10 p-4 md:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl md:grid-cols-2 md:min-h-[calc(100vh-4rem)]">
        <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-content md:flex">
          <div className="flex items-center gap-3 text-xl font-bold">
            <img src="/logo.png" alt="DBS" className="h-8 w-auto" />
            DADS Bookshelves
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">Welcome back to your digital library</h1>
            <p className="max-w-md text-primary-content/90">Read, buy, and manage books in one place with a clean and secure experience.</p>
            <div className="space-y-3 text-sm text-primary-content/90">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Secure account access</div>
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Fast and simple dashboard</div>
            </div>
          </div>
          <p className="text-xs text-primary-content/80">Knowledge without limits.</p>
        </div>

        <div className="flex items-center justify-center p-4 sm:p-8 md:p-12">
          <Card className="w-full max-w-md border border-base-300 bg-base-100 shadow-none">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-1 text-center">
                <h2 className="text-2xl font-bold">Sign in</h2>
                <p className="text-sm text-base-content/70">Access your account to continue</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && <div className="alert alert-error"><span>{error}</span></div>}
                {searchParams.get('ref') && (
                  <div className="alert alert-info text-sm">
                    <span>Referral code applied: <strong>{searchParams.get('ref')}</strong></span>
                  </div>
                )}
                <Input
                  label="Referral Code (Optional)"
                  type="text"
                  placeholder="AMB123_REF"
                  error={errors.referral_code?.message}
                  {...register('referral_code')}
                />
                <Input
                  label="Email or Phone"
                  type="text"
                  placeholder="your@email.com or 07xx xxx xxx"
                  autoComplete="username"
                  error={errors.username?.message}
                  {...register('username', { required: 'Email or phone is required' })}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={errors.password?.message}
                  {...register('password', { required: 'Password is required' })}
                />
                <div className="flex justify-end">
                  <Link to="/forgotpassword" className="link link-primary text-sm">Forgot password?</Link>
                </div>
                <Button type="submit" loading={isLoading} className="w-full">Login</Button>
              </form>

              <p className="text-center text-sm text-base-content/70">
                Don&apos;t have an account? <Link to="/register" className="link link-primary">Register</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

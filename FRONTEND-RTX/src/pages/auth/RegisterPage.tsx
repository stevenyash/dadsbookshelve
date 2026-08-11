import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ShieldCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card, CardContent } from '@/components/Card'
import api from '@/lib/api'

interface RegisterFormData {
  name: string
  email: string
  telephone: string
  password: string
  confirmPassword: string
  referral_code?: string
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<RegisterFormData>()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setValue('referral_code', ref)
    }
  }, [searchParams, setValue])

  const password = watch('password')

  const onSubmit = async (data: RegisterFormData) => {
    setError('')
    setIsLoading(true)
    try {
      await api.post('/clients/add', {
        name: data.name,
        email: data.email,
        password: data.password,
        telephone: data.telephone,
        referral_code: data.referral_code,
      })

      toast.success('Registration successful! Please login.')
      navigate('/login')
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-base-100 to-base-200 p-4 md:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl md:grid-cols-2 md:min-h-[calc(100vh-4rem)]">
        <div className="relative hidden flex-col justify-between bg-secondary p-10 text-secondary-content md:flex">
          <div className="flex items-center gap-3 text-xl font-bold">
            <img src="/logo.png" alt="DBS" className="h-8 w-auto" />
            DADS Bookshelves
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">Create your account and start reading</h1>
            <p className="max-w-md text-secondary-content/90">Join our readers community and unlock library access, book purchases, and personalized experiences.</p>
            <div className="space-y-3 text-sm text-secondary-content/90">
              <div className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Quick account setup</div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Protected user data</div>
            </div>
          </div>
          <p className="text-xs text-secondary-content/80">Your next story starts here.</p>
        </div>

        <div className="flex items-center justify-center p-4 sm:p-8 md:p-10">
          <Card className="w-full max-w-md border border-base-300 bg-base-100 shadow-none">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-1 text-center">
                <h2 className="text-2xl font-bold">Create Account</h2>
                <p className="text-sm text-base-content/70">Sign up to continue to DBS</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && <div className="alert alert-error"><span>{error}</span></div>}

                <Input
                  label="Full Name"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  error={errors.name?.message}
                  {...register('name', { required: 'Name is required' })}
                />

                <Input
                  label="Email"
                  type="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  error={errors.email?.message}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="07xx xxx xxx"
                  autoComplete="tel"
                  error={errors.telephone?.message}
                  {...register('telephone', { required: 'Phone is required' })}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors.password?.message}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword', {
                    required: 'Please confirm password',
                    validate: (value) => value === password || 'Passwords do not match',
                  })}
                />

                <Input
                  label="Referral Code (Optional)"
                  type="text"
                  placeholder="Enter referral code"
                  {...register('referral_code')}
                />

                <Button type="submit" loading={isLoading} className="w-full">Register</Button>
              </form>

              <p className="text-center text-sm text-base-content/70">
                Already have an account? <Link to="/login" className="link link-primary">Login</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

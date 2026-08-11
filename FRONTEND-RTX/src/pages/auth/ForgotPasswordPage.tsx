import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ArrowLeft, Mail } from 'lucide-react'
import { authApi } from '@/lib/api'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card, CardContent } from '@/components/Card'

interface ForgotPasswordFormData {
  email: string
}

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>()

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    try {
      await authApi.forgotPassword(data.email)
      setEmailSent(true)
      toast.success('Password reset link sent to your email')
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to send reset link'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-primary/10 p-4 md:p-8">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center pt-20">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
              <Mail className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="mt-2 text-base-content/70">
              We've sent a password reset link to your email address.
            </p>
            <p className="mt-4 text-sm text-base-content/60">
              Didn't receive the email? Check your spam folder or <button onClick={() => setEmailSent(false)} className="link link-primary">try again</button>
            </p>
          </div>
          <Link to="/login" className="mt-8 link link-primary flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
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
              <h2 className="text-2xl font-bold">Forgot password?</h2>
              <p className="text-sm text-base-content/70">
                Enter your email and we'll send you a link to reset your password
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="your@email.com"
                error={errors.email?.message}
                {...register('email', { 
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                })}
              />
              <Button type="submit" loading={isLoading} className="w-full">
                Send reset link
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
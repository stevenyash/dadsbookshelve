import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Mail, Lock, User, Phone, Users } from 'lucide-react'
import api from '@/lib/api'

interface SignupForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  mpesaPhone: string
}

function useSignup() {
  const navigate = useNavigate()
  
  return useMutation({
    mutationFn: async (data: SignupForm) => {
      const res = await api.post('marketers/add', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        mpesaPhone: data.mpesaPhone
      })
      return res.data
    },
    onSuccess: (data) => {
      alert(`Registration successful! Your referral code is ${data.data?.referralCode}. Login to your dashboard.`)
      navigate('/affiliate/login')
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Registration failed')
    }
  })
}

export function AffiliateSignupPage() {
  const { register, handleSubmit } = useForm()
  const signup = useSignup()

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
      <div className="card w-full max-w-md bg-base-200">
        <div className="card-body">
          <div className="text-center mb-6">
            <Users className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-2xl font-bold mt-4">Become an Affiliate</h1>
            <p className="opacity-70">Join our marketer program and earn commissions</p>
          </div>

          <form onSubmit={handleSubmit(signup.mutate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">First Name *</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 opacity-50" />
                  <input
                    type="text"
                    className="input input-bordered pl-10 w-full"
                    placeholder="John"
                    {...register('firstName', { required: true })}
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Last Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Doe"
                  {...register('lastName')}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Email *</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 opacity-50" />
                <input
                  type="email"
                  className="input input-bordered pl-10 w-full"
                  placeholder="you@example.com"
                  {...register('email', { required: true })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Phone</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 opacity-50" />
                <input
                  type="tel"
                  className="input input-bordered pl-10 w-full"
                  placeholder="+254712345678"
                  {...register('phone')}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">M-Pesa Number (for payouts)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 opacity-50" />
                <input
                  type="tel"
                  className="input input-bordered pl-10 w-full"
                  placeholder="+254712345678"
                  {...register('mpesaPhone')}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full"
              disabled={signup.isPending}
            >
              {signup.isPending ? 'Registering...' : 'Register as Affiliate'}
            </button>
          </form>

          <div className="divider">OR</div>

          <p className="text-center">
            Already have an account?{' '}
            <Link to="/affiliate/login" className="link link-primary">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function AffiliateLoginPage() {
  const { register, handleSubmit } = useForm()
  const navigate = useNavigate()

  const login = useMutation({
    mutationFn: async (data: { identifier: string; password: string }) => {
      const res = await api.post('auth/login', {
        username: data.identifier,
        password: data.password
      })
      return res.data
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user_id', data.data.user.user_id)
      window.location.href = '/affiliate/dashboard'
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Login failed')
    }
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
      <div className="card w-full max-w-md bg-base-200">
        <div className="card-body">
          <div className="text-center mb-6">
            <Users className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-2xl font-bold mt-4">Affiliate Login</h1>
            <p className="opacity-70">Login to your affiliate dashboard</p>
          </div>

          <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email or Phone</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 opacity-50" />
                <input
                  type="text"
                  className="input input-bordered pl-10 w-full"
                  placeholder="you@example.com"
                  {...register('identifier', { required: true })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 opacity-50" />
                <input
                  type="password"
                  className="input input-bordered pl-10 w-full"
                  placeholder="********"
                  {...register('password', { required: true })}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full"
              disabled={login.isPending}
            >
              {login.isPending ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="divider">OR</div>

          <p className="text-center">
            New affiliate?{' '}
            <Link to="/affiliate/signup" className="link link-primary">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AffiliateSignupPage
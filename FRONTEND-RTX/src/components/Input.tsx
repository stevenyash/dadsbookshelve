import { forwardRef, useState } from 'react'
import { clsx } from 'clsx'
import { Eye, EyeOff } from 'lucide-react'

export const Input = forwardRef(function Input({ label, error, className, type = 'text', showPasswordToggle, ...props }, ref) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div className="form-control w-full">
      {label && <label className="label"><span className="label-text">{label}</span></label>}
      <div className="relative">
        <input 
          ref={ref} 
          type={inputType} 
          className={clsx('input input-bordered w-full pr-10', error && 'input-error', className)} 
          {...props} 
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ label, error, className, ...props }, ref) {
  return (
    <div className="form-control w-full">
      {label && <label className="label"><span className="label-text">{label}</span></label>}
      <textarea ref={ref} className={clsx('textarea textarea-bordered', error && 'textarea-error', className)} {...props} />
      {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
    </div>
  )
})
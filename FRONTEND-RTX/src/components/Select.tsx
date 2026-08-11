import { forwardRef } from 'react'
import { clsx } from 'clsx'

export const Select = forwardRef(function Select({ label, error, options = [], placeholder, className, ...props }, ref) {
  return (
    <div className="form-control w-full">
      {label && <label className="label"><span className="label-text">{label}</span></label>}
      <select ref={ref} className={clsx('select select-bordered', error && 'select-error', className)} {...props}>
        {placeholder && <option disabled value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
    </div>
  )
})
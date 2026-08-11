import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="form-control w-full">
        {label && (
          <label className="label" htmlFor={id}>
            <span className="label-text font-medium">{label}</span>
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            'input input-bordered w-full rounded-lg transition-all duration-200',
            error ? 'input-error' : 'focus:input-primary',
            className
          )}
          {...props}
        />
        {error && (
          <label className="label">
            <span className="label-text-alt text-error">{error}</span>
          </label>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

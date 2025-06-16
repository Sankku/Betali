import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  containerClassName?: string;
  labelClassName?: string;
  variant?: 'default' | 'filled' | 'outlined';
  inputSize?: 'sm' | 'default' | 'lg';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = 'default',
      inputSize = 'default',
      type,
      label,
      description,
      error,
      success,
      icon,
      iconPosition = 'left',
      containerClassName,
      labelClassName,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    const inputClasses = cn(
      'form-input focus-ring',
      error && 'error',
      success && 'success',
      icon && iconPosition === 'left' && 'pl-10',
      icon && iconPosition === 'right' && 'pr-10',
      inputSize === 'sm' && 'h-9 px-3 py-2 text-xs',
      inputSize === 'lg' && 'h-12 px-4 py-3 text-base',
      variant === 'filled' && 'bg-muted border-transparent focus:bg-white',
      variant === 'outlined' && 'border-neutral-300 bg-transparent',
      className
    );

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium',
              error ? 'text-danger' : success ? 'text-success' : 'text-neutral-700',
              labelClassName
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted">
              {icon}
            </div>
          )}

          <input
            type={type}
            id={inputId}
            className={inputClasses}
            ref={ref}
            aria-describedby={cn(descriptionId, errorId)}
            aria-invalid={error ? 'true' : 'false'}
            {...props}
          />

          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted">
              {icon}
            </div>
          )}
        </div>

        {description && !error && !success && (
          <p id={descriptionId} className="text-xs text-muted">
            {description}
          </p>
        )}

        {error && (
          <p id={errorId} className="text-xs text-danger flex items-center gap-1">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {success && (
          <p className="text-xs text-success flex items-center gap-1">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {success}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

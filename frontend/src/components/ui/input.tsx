import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled';
  helpText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      description,
      error,
      icon,
      rightIcon,
      variant = 'default',
      helpText,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = props.id || props.name;

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {description && <p className="text-xs text-neutral-500">{description}</p>}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
              {icon}
            </div>
          )}

          <input
            type={type}
            className={cn(
              'w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900',
              'placeholder:text-neutral-500',
              'focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50 disabled:text-neutral-600',
              'transition-colors duration-200',
              'selection:bg-primary-200 selection:text-primary-900',
              'autofill:bg-white autofill:text-neutral-900',
              'autofill:shadow-[inset_0_0_0px_1000px_white]',
              'autofill:[-webkit-text-fill-color:theme(colors.neutral.900)]',
              'autofill:selection:bg-primary-200 autofill:selection:text-primary-900',
              variant === 'filled' && 'bg-neutral-50 border-neutral-200',
              variant === 'filled' &&
                'autofill:shadow-[inset_0_0_0px_1000px_theme(colors.neutral.50)]',
              icon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-danger-500 focus:border-danger-600 focus:ring-danger-500/20',
              className
            )}
            ref={ref}
            disabled={disabled}
            id={inputId}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {helpText && !error && <p className="text-xs text-neutral-500">{helpText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

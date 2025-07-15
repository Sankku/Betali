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
      <div className="space-y-3">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-neutral-800 flex items-center"
          >
            {icon && <span className="text-neutral-600 mr-2">{icon}</span>}
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {description && <p className="text-xs text-neutral-600">{description}</p>}

        <div className="relative">
          <input
            type={type}
            className={cn(
              'w-full rounded-lg border-2 border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900',
              'placeholder:text-neutral-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'hover:border-neutral-400 hover:bg-neutral-50',
              'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-neutral-100',
              'shadow-sm',
              'transition-all duration-200',
              'selection:bg-blue-200 selection:text-blue-900',
              'autofill:bg-white autofill:text-neutral-900',
              'autofill:shadow-[inset_0_0_0px_1000px_white]',
              'autofill:[-webkit-text-fill-color:theme(colors.neutral.900)]',
              'autofill:selection:bg-blue-200 autofill:selection:text-blue-900',
              variant === 'filled' && 'bg-neutral-50 border-neutral-200',
              variant === 'filled' &&
                'autofill:shadow-[inset_0_0_0px_1000px_theme(colors.neutral.50)]',
              rightIcon && 'pr-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
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

        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

        {helpText && !error && <p className="text-xs text-neutral-500">{helpText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

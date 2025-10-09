import * as React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  error?: string;
  variant?: 'default' | 'switch';
  size?: 'sm' | 'default' | 'lg';
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      onCheckedChange,
      checked,
      label,
      description,
      error,
      variant = 'default',
      size = 'default',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || React.useId();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
      props.onChange?.(e);
    };

    if (variant === 'switch') {
      return (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'text-sm font-medium cursor-pointer',
                  error ? 'text-danger-600' : 'text-neutral-700',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={cn('text-xs mt-1', error ? 'text-danger' : 'text-neutral-500')}>
                {description}
              </p>
            )}
          </div>

          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              id={checkboxId}
              className="sr-only peer"
              ref={ref}
              checked={checked}
              onChange={handleChange}
              disabled={disabled}
              {...props}
            />
            <label
              htmlFor={checkboxId}
              className={cn(
                "relative peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:transition-all after:shadow-sm peer-disabled:opacity-50 peer-disabled:cursor-not-allowed rounded-md transition-colors duration-200 cursor-pointer",
                size === 'sm' && 'w-9 h-5 after:h-4 after:w-4 after:rounded-sm',
                size === 'default' && 'w-11 h-6 after:h-5 after:w-5 after:rounded',
                size === 'lg' && 'w-13 h-7 after:h-6 after:w-6 after:rounded-md',
                checked ? 'bg-primary-500' : 'bg-neutral-200',
                error && 'ring-2 ring-danger/20',
                disabled && 'cursor-not-allowed',
                className
              )}
            />
          </div>

          {error && (
            <p className="text-xs text-danger-600 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-start space-x-3">
        <div className="relative inline-flex items-center">
          <input
            type="checkbox"
            id={checkboxId}
            className="sr-only peer"
            ref={ref}
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className={cn(
              'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 border transition-all duration-200 flex items-center justify-center peer-disabled:opacity-50 peer-disabled:cursor-not-allowed rounded-sm shadow-sm cursor-pointer',
              size === 'sm' && 'h-4 w-4',
              size === 'default' && 'h-5 w-5',
              size === 'lg' && 'h-6 w-6',
              checked
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300 hover:border-neutral-400',
              error && 'border-danger',
              disabled && 'cursor-not-allowed',
              className
            )}
          >
            {checked && (
              <Check
                className={cn(
                  'text-white',
                  size === 'sm' && 'h-3 w-3',
                  size === 'default' && 'h-3.5 w-3.5',
                  size === 'lg' && 'h-4 w-4'
                )}
              />
            )}
          </label>
        </div>

        <div className="flex-1">
          {label && (
            <label
              htmlFor={checkboxId}
              className={cn(
                'text-sm font-medium cursor-pointer block',
                error ? 'text-danger-600' : 'text-neutral-700',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className={cn('text-xs mt-1', error ? 'text-danger' : 'text-neutral-500')}>
              {description}
            </p>
          )}
          {error && (
            <p className="text-xs text-danger flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };

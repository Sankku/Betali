import React from 'react';
import { cn } from '../../lib/utils';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  size = 'md',
  variant = 'default',
}) => {
  const sizeClasses = {
    sm: {
      track: 'w-9 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-4',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7',
    },
  };

  const variantClasses = {
    default: checked ? 'bg-primary-600' : 'bg-neutral-200',
    success: checked ? 'bg-green-600' : 'bg-neutral-200',
    warning: checked ? 'bg-yellow-600' : 'bg-neutral-200',
    danger: checked ? 'bg-red-600' : 'bg-neutral-200',
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2',
          sizeClasses[size].track,
          variantClasses[variant],
          disabled && 'opacity-50 cursor-not-allowed',
          checked ? 'focus:ring-primary-500' : 'focus:ring-neutral-500'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0',
            'transition duration-200 ease-in-out',
            sizeClasses[size].thumb,
            checked ? sizeClasses[size].translate : 'translate-x-0'
          )}
        />
      </button>

      {(label || description) && (
        <div className="ml-3">
          {label && (
            <span
              className={cn(
                'text-sm font-medium',
                disabled ? 'text-neutral-400' : 'text-neutral-900'
              )}
            >
              {label}
            </span>
          )}
          {description && (
            <p className={cn('text-xs', disabled ? 'text-neutral-300' : 'text-neutral-500')}>
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export { Toggle };

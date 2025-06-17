import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'default' | 'lg' | 'icon' | 'icon-sm';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'default',
      asChild = false,
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    const isDisabled = disabled || loading;

    const baseClasses = cn(
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',

      {
        'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-primary-500':
          variant === 'primary',

        'bg-neutral-100 text-neutral-900 border border-neutral-300 hover:bg-neutral-200 active:bg-neutral-300 focus-visible:ring-neutral-500':
          variant === 'secondary',

        'border border-primary-500 text-primary-600 bg-transparent hover:bg-primary-50 active:bg-primary-100 focus-visible:ring-primary-500':
          variant === 'outline',

        'text-neutral-600 bg-transparent hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-500':
          variant === 'ghost',

        'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 focus-visible:ring-danger-500':
          variant === 'danger',

        'bg-success-500 text-white hover:bg-success-600 active:bg-success-700 focus-visible:ring-success-500':
          variant === 'success',
      },

      {
        'h-9 px-3 text-xs': size === 'sm',
        'h-10 px-4 py-2': size === 'default',
        'h-12 px-6 text-base': size === 'lg',
        'h-10 w-10 p-0': size === 'icon',
        'h-8 w-8 p-0': size === 'icon-sm',
      },

      className
    );

    return (
      <Comp className={baseClasses} ref={ref} disabled={isDisabled} {...props}>
        {loading && (
          <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}

        {!loading && icon && iconPosition === 'left' && (
          <span className="mr-2 flex items-center">{icon}</span>
        )}

        {children}

        {!loading && icon && iconPosition === 'right' && (
          <span className="ml-2 flex items-center">{icon}</span>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button };

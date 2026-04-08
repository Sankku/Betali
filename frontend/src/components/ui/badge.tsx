import React from 'react';
import { cn } from '../../lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
        primary: 'bg-primary-100 text-primary-700 hover:bg-primary-200',
        success: 'bg-success-100 text-success-700 hover:bg-success-200',
        warning: 'bg-warning-100 text-warning-700 hover:bg-warning-200',
        danger: 'bg-danger-100 text-danger-700 hover:bg-danger-200',
        info: 'bg-primary-100 text-primary-700 hover:bg-primary-200',
        outline: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const statusDotVariants: Record<string, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    const dotColor = variant ? statusDotVariants[variant] : undefined;
    return (
      <div ref={ref} className={cn(badgeVariants({ variant, size }), 'gap-1.5', className)} {...props}>
        {dotColor && <span className={cn('inline-block w-1.5 h-1.5 rounded-full flex-shrink-0', dotColor)} />}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };

import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AlertProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({ variant = 'default', title, children, className }) => {
  const icons = {
    default: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
    info: Info,
  };

  const variantClasses = {
    default: 'bg-neutral-50 dark:bg-neutral-500/10 border-neutral-200 dark:border-neutral-500/20 text-neutral-800 dark:text-neutral-300',
    success: 'bg-success-50 dark:bg-success-500/10 border-success-200 dark:border-success-500/20 text-success-800 dark:text-success-300',
    warning: 'bg-warning-50 dark:bg-warning-500/10 border-warning-200 dark:border-warning-500/20 text-warning-800 dark:text-warning-300',
    error: 'bg-danger-50 dark:bg-danger-500/10 border-danger-200 dark:border-danger-500/20 text-danger-800 dark:text-danger-300',
    info: 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/20 text-primary-800 dark:text-primary-300',
  };

  const iconColors = {
    default: 'text-neutral-400 dark:text-neutral-500',
    success: 'text-green-500 dark:text-green-400',
    warning: 'text-yellow-500 dark:text-yellow-400',
    error: 'text-red-500 dark:text-red-400',
    info: 'text-blue-500 dark:text-blue-400',
  };

  const Icon = icons[variant];

  return (
    <div className={cn('rounded-lg border p-4', variantClasses[variant], className)}>
      <div className="flex">
        <Icon className={cn('w-5 h-5 mr-3 mt-0.5 flex-shrink-0', iconColors[variant])} />
        <div className="flex-1">
          {title && <h5 className="font-medium mb-1">{title}</h5>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
};

export { Alert };

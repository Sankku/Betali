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
    default: 'bg-neutral-50 border-neutral-200 text-neutral-800',
    success: 'bg-success-50 border-success-200 text-success-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    error: 'bg-danger-50 border-danger-200 text-danger-800',
    info: 'bg-primary-50 border-primary-200 text-primary-800',
  };

  const iconColors = {
    default: 'text-neutral-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-blue-400',
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

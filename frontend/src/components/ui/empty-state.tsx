import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
    >
      {Icon && (
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl border border-primary-200/60 flex items-center justify-center mb-5">
          <Icon className="w-7 h-7 text-primary-500" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>

      {description && <p className="text-neutral-500 mb-5 max-w-sm leading-relaxed">{description}</p>}

      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
};

export { EmptyState };

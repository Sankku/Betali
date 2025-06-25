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
        <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-neutral-400" />
        </div>
      )}

      <h3 className="text-lg font-medium text-neutral-900 mb-2">{title}</h3>

      {description && <p className="text-neutral-600 mb-4 max-w-sm">{description}</p>}

      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
};

export { EmptyState };

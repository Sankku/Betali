import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FormSectionProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  variant?: 'default' | 'highlighted';
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  icon: Icon,
  children,
  variant = 'default',
  className,
}) => {
  return (
    <div
      className={cn(
        'space-y-4',
        variant === 'highlighted' && 'bg-neutral-50 border border-neutral-200 rounded-lg p-6',
        className
      )}
    >
      {(title || description || Icon) && (
        <div className="space-y-1">
          {title && (
            <h4 className="text-lg font-semibold flex items-center text-neutral-900">
              {Icon && <Icon className="w-5 h-5 mr-2 text-primary-600" />}
              {title}
            </h4>
          )}
          {description && <p className="text-sm text-neutral-600">{description}</p>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
};

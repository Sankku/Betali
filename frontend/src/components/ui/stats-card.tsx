import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from './card';

export interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}) => {
  const variantClasses = {
    default: 'border-neutral-200/60 bg-gradient-to-br from-white to-neutral-50/80',
    primary: 'border-primary-200/60 bg-gradient-to-br from-primary-50/50 to-primary-100/80',
    success: 'border-success-200/60 bg-gradient-to-br from-success-50/50 to-success-100/80',
    warning: 'border-warning-200/60 bg-gradient-to-br from-warning-50/50 to-warning-100/80',
    danger: 'border-danger-200/60 bg-gradient-to-br from-danger-50/50 to-danger-100/80',
  };

  const iconColors = {
    default: 'bg-gradient-to-br from-neutral-500 to-neutral-600 text-white shadow-lg',
    primary:
      'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30',
    success:
      'bg-gradient-to-br from-success-500 to-success-600 text-white shadow-lg shadow-success-500/30',
    warning:
      'bg-gradient-to-br from-warning-500 to-warning-600 text-white shadow-lg shadow-warning-500/30',
    danger:
      'bg-gradient-to-br from-danger-500 to-danger-600 text-white shadow-lg shadow-danger-500/30',
  };

  const textColors = {
    default: 'text-neutral-700',
    primary: 'text-primary-700',
    success: 'text-success-700',
    warning: 'text-warning-700',
    danger: 'text-danger-700',
  };

  const valueColors = {
    default: 'text-neutral-800',
    primary: 'text-primary-800',
    success: 'text-success-800',
    warning: 'text-warning-800',
    danger: 'text-danger-800',
  };

  return (
    <Card
      variant="elevated"
      className={cn(
        'hover-lift transition-all duration-300 hover:shadow-xl',
        'border-2 backdrop-blur-sm text-center',
        variantClasses[variant],
        className
      )}
      padding="lg"
    >
      <div className="flex flex-col items-center space-y-4">
        {Icon && (
          <div
            className={cn(
              'p-4 rounded-2xl transform transition-transform duration-200 hover:scale-110',
              iconColors[variant]
            )}
          >
            <Icon className="w-8 h-8" />
          </div>
        )}

        <div className="space-y-2">
          <p className={cn('text-xs font-bold tracking-widest uppercase', textColors[variant])}>
            {title}
          </p>
          <p className={cn('text-2xl font-black tracking-tight', valueColors[variant])}>{value}</p>
          {description && (
            <p className="text-sm text-neutral-600 font-medium leading-relaxed">{description}</p>
          )}
        </div>

        {trend && (
          <div className="flex items-center justify-center space-x-2">
            <div
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold',
                trend.direction === 'up' && 'bg-success-100 text-success-700',
                trend.direction === 'down' && 'bg-danger-100 text-danger-700',
                trend.direction === 'neutral' && 'bg-neutral-100 text-neutral-700'
              )}
            >
              {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
              {trend.direction === 'neutral' && <Minus className="w-3 h-3" />}
              {trend.value}%
            </div>
            <span className="text-xs text-neutral-500 font-medium">{trend.label}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export { StatsCard };

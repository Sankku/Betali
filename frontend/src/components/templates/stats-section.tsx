import React from 'react';
import { LucideIcon } from 'lucide-react';
import { StatsCard } from '../ui/stats-card';

export interface StatItem {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
}

export interface StatsSectionProps {
  title?: string;
  description?: string;
  stats: StatItem[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  title,
  description,
  stats,
  columns = 3,
  className,
}) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={className}>
      {(title || description) && (
        <div className="mb-6">
          {title && <h4 className="text-lg font-semibold mb-2 text-neutral-900">{title}</h4>}
          {description && <p className="text-sm text-neutral-600">{description}</p>}
        </div>
      )}

      <div className={`grid gap-6 ${gridClasses[columns]}`}>
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            variant={stat.variant}
            trend={stat.trend}
          />
        ))}
      </div>
    </div>
  );
};

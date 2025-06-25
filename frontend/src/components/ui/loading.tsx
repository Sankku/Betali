import React from 'react';
import { cn } from '../../lib/utils';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
  text?: string;
}

const Loading: React.FC<LoadingProps> = ({ size = 'md', variant = 'spinner', className, text }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const renderSpinner = () => (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600',
        sizeClasses[size],
        className
      )}
    />
  );

  const renderDots = () => (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={cn(
            'rounded-full bg-primary-600 animate-pulse',
            size === 'sm' && 'w-1 h-1',
            size === 'md' && 'w-2 h-2',
            size === 'lg' && 'w-3 h-3'
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={cn('rounded-full bg-primary-600 animate-pulse', sizeClasses[size], className)}
    />
  );

  const loadingComponent = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  if (text) {
    return (
      <div className="flex items-center space-x-2">
        {loadingComponent()}
        <span className="text-sm text-neutral-600">{text}</span>
      </div>
    );
  }

  return loadingComponent();
};

export { Loading };

import React from 'react';
import { CellConfig } from '../../../types/table';

interface TextCellProps {
  value: string;
  config?: CellConfig['textConfig'];
}

export const TextCell: React.FC<TextCellProps> = ({ value, config = {} }) => {
  const {
    truncate,
    transform = 'none',
    weight = 'normal',
    size = 'base',
    color,
    prefix = '',
    suffix = '',
  } = config;

  const processedValue = String(value);
  const shouldTruncate = truncate && processedValue.length > truncate;

  const weightClasses: Record<typeof weight, string> = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const sizeClasses: Record<typeof size, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const transformClasses: Record<typeof transform, string> = {
    none: 'normal-case',
    uppercase: 'uppercase',
    lowercase: 'lowercase',
    capitalize: 'capitalize',
  };

  const dynamicColorClass = color ? '' : 'text-neutral-900';

  const combinedClassNames = [
    weightClasses[weight],
    sizeClasses[size],
    transformClasses[transform],
    dynamicColorClass,
    shouldTruncate ? 'block overflow-hidden whitespace-nowrap text-ellipsis' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="max-w-full overflow-hidden">
      <span
        className={combinedClassNames}
        style={color ? { color } : undefined}
        title={shouldTruncate ? value : undefined}
      >
        {prefix}
        {processedValue}
        {suffix}
      </span>
    </div>
  );
};

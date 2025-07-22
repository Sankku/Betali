import React from 'react';
import { CellConfig } from '../../../types/table';

interface ProgressCellProps {
  value: number;
  config?: CellConfig['progressConfig'];
}

export const ProgressCell: React.FC<ProgressCellProps> = ({ value, config = {} }) => {
  const {
    max = 100,
    showPercentage = true,
    color = 'bg-primary-500',
    height = 'normal'
  } = config;

  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const heightClasses = {
    thin: 'h-1',
    normal: 'h-2',
    thick: 'h-3'
  };

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className={`flex-1 bg-neutral-200 rounded-full overflow-hidden ${heightClasses[height]}`}>
        <div
          className={`${color} ${heightClasses[height]} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-xs text-neutral-600 font-medium tabular-nums">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};
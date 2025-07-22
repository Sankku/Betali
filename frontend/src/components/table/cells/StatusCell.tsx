import React from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { CellConfig } from '../../../types/table';

interface StatusCellProps {
  value: boolean;
  row: any;
  config?: CellConfig['statusConfig'];
  onAction?: (action: string, row: any) => void;
}

export const StatusCell: React.FC<StatusCellProps> = ({ 
  value, 
  row, 
  config = {},
  onAction 
}) => {
  const {
    activeLabel = 'Activo',
    inactiveLabel = 'Inactivo',
    activeVariant = 'success',
    inactiveVariant = 'danger',
    showToggle = false,
    toggleDisabled = false
  } = config;

  const isActive = Boolean(value);

  return (
    <div className="flex items-center space-x-2">
      <Badge variant={isActive ? activeVariant : inactiveVariant}>
        {isActive ? activeLabel : inactiveLabel}
      </Badge>
      
      {showToggle && onAction && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={e => {
            e.stopPropagation();
            onAction('toggle', row);
          }}
          disabled={toggleDisabled}
          className="hover:bg-neutral-100"
        >
          {isActive ? (
            <ToggleRight className="w-4 h-4 text-success-600" />
          ) : (
            <ToggleLeft className="w-4 h-4 text-neutral-400" />
          )}
        </Button>
      )}
    </div>
  );
};
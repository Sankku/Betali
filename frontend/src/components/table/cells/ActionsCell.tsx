import React from 'react';
import { Button } from '../../ui/button';
import { Icon } from '../../ui/Icon';
import { CellConfig } from '../../../types/table';

interface ActionsCellProps {
  row: any;
  config?: CellConfig['actionsConfig'];
  onAction?: (action: string, row: any) => void;
}

export const ActionsCell: React.FC<ActionsCellProps> = ({ 
  row, 
  config,
  onAction 
}) => {
  if (!config?.actions || !onAction) {
    return <span>—</span>;
  }

  const { actions, layout = 'horizontal' } = config;

  if (layout === 'dropdown') {
    // TODO: Implementar dropdown para muchas acciones
    return <div>Dropdown actions (TODO)</div>;
  }

  return (
    <div className="flex items-center gap-1">
      {actions.map((action) => (
        <Button
          key={action.key}
          variant={action.variant || 'ghost'}
          size={action.size || 'sm'}
          disabled={action.disabled}
          onClick={e => {
            e.stopPropagation();
            onAction(action.key, row);
          }}
          className="h-8 w-8 p-0"
          title={action.label}
        >
          {action.icon && (
            <Icon name={action.icon} size={14} />
          )}
        </Button>
      ))}
    </div>
  );
};
import React, { useState } from 'react';
import { Button } from './button';
import { ChevronDown, Trash2, Edit, Download, Archive, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  onClick: (selectedRows: any[]) => void;
}

interface BulkActionsButtonProps {
  selectedRows: any[];
  actions: BulkAction[];
  disabled?: boolean;
  className?: string;
}

const defaultActions: BulkAction[] = [
  {
    id: 'delete',
    label: 'Eliminar seleccionados',
    icon: <Trash2 className="h-4 w-4" />,
    variant: 'destructive',
    onClick: (rows) => console.log('Delete', rows),
  },
  {
    id: 'export',
    label: 'Exportar seleccionados',
    icon: <Download className="h-4 w-4" />,
    variant: 'outline',
    onClick: (rows) => console.log('Export', rows),
  },
];

export function BulkActionsButton({
  selectedRows,
  actions = defaultActions,
  disabled = false,
  className,
}: BulkActionsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCount = selectedRows.length;

  if (selectedCount === 0) return null;

  const handleActionClick = (action: BulkAction) => {
    action.onClick(selectedRows);
    setIsOpen(false);
  };

  // If only one action, show it directly as a button
  if (actions.length === 1) {
    const action = actions[0];
    return (
      <Button
        variant={action.variant || 'outline'}
        size="sm"
        onClick={() => handleActionClick(action)}
        disabled={disabled}
        className={cn(
          'bg-white/70 backdrop-blur-sm border-neutral-300/60 hover:bg-white/90 text-neutral-700 hover:text-neutral-900 transition-all duration-200',
          className
        )}
      >
        {action.icon}
        <span className="ml-2">{action.label}</span>
        <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">
          {selectedCount}
        </span>
      </Button>
    );
  }

  // Multiple actions - show dropdown
  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'bg-white/70 backdrop-blur-sm border-neutral-300/60 hover:bg-white/90 text-neutral-700 hover:text-neutral-900 transition-all duration-200',
          className
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="ml-2">Acciones</span>
        <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">
          {selectedCount}
        </span>
        <ChevronDown className="ml-2 h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg border border-neutral-200 shadow-lg z-50">
          <div className="py-1">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 flex items-center space-x-2 transition-colors',
                  action.variant === 'destructive' && 'text-red-600 hover:bg-red-50'
                )}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
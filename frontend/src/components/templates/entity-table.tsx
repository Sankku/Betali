import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export interface EntityTableAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (entity: T) => void;
  variant?: 'default' | 'destructive';
  disabled?: (entity: T) => boolean;
  hidden?: (entity: T) => boolean;
}

export interface EntityTableColumn<T> {
  accessorKey: keyof T;
  header: string;
  cell?: (value: any, entity: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

export function createEntityTableColumns<T>(
  columns: EntityTableColumn<T>[],
  actions?: EntityTableAction<T>[]
): ColumnDef<T>[] {
  const baseColumns: ColumnDef<T>[] = columns.map(col => ({
    accessorKey: col.accessorKey as string,
    header: col.header,
    cell: col.cell
      ? ({ row }) => {
          const value = row.getValue(col.accessorKey as string);
          return col.cell!(value, row.original);
        }
      : undefined,
    enableSorting: col.sortable ?? true,
    size: col.width ? parseInt(col.width) : undefined,
  }));

  if (actions && actions.length > 0) {
    baseColumns.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const entity = row.original;
        const visibleActions = actions.filter(action => !action.hidden?.(entity));

        if (visibleActions.length === 0) return null;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {visibleActions.map((action, index) => {
                  const Icon = action.icon;
                  const isDisabled = action.disabled?.(entity);

                  return (
                    <DropdownMenuItem
                      key={index}
                      onClick={() => !isDisabled && action.onClick(entity)}
                      disabled={isDisabled}
                      className={
                        action.variant === 'destructive' ? 'text-red-600 focus:text-red-600' : ''
                      }
                    >
                      {Icon && <Icon className="w-4 h-4 mr-2" />}
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: false,
      size: 50,
    });
  }

  return baseColumns;
}

// Acciones predefinidas comunes
export const commonEntityActions = {
  view: function <T>(onView: (entity: T) => void): EntityTableAction<T> {
    return {
      label: 'Ver detalles',
      icon: Eye,
      onClick: onView,
    };
  },

  edit: function <T>(onEdit: (entity: T) => void): EntityTableAction<T> {
    return {
      label: 'Editar',
      icon: Edit,
      onClick: onEdit,
    };
  },

  delete: function <T>(onDelete: (entity: T) => void): EntityTableAction<T> {
    return {
      label: 'Eliminar',
      icon: Trash2,
      onClick: onDelete,
      variant: 'destructive',
    };
  },
};

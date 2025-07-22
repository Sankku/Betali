import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '../layout/Dashboard';
import { DataTable } from '../ui/data-table';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export interface CRUDPageProps<TEntity> {
  title: string;
  description?: string;
  data: TEntity[];
  isLoading: boolean;
  error?: Error | null;
  columns?: ColumnDef<TEntity>[];
  onCreateClick: () => void;
  onRowClick?: (entity: TEntity) => void;
  headerActions?: React.ReactNode;
  beforeTable?: React.ReactNode;
  afterTable?: React.ReactNode;
  customTable?: React.ReactNode; // New prop for custom table component
  isAnyMutationLoading?: boolean;
  className?: string;
}

export function CRUDPage<TEntity>({
  title,
  description,
  data = [],
  isLoading,
  error,
  columns,
  onCreateClick,
  onRowClick,
  headerActions,
  beforeTable,
  afterTable,
  customTable,
  isAnyMutationLoading = false,
  className,
}: CRUDPageProps<TEntity>) {
  return (
    <DashboardLayout>
      <div className={cn('space-y-6', className)}>
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{title}</h1>
            {description && <p className="text-neutral-600">{description}</p>}
          </div>

          <div className="flex items-center space-x-3">
            {headerActions}
            <Button
              onClick={onCreateClick}
              disabled={isAnyMutationLoading}
              className="bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear
            </Button>
          </div>
        </div>
        {beforeTable}
        {error ? (
          <div className="p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Error loading data</h3>
            <p className="text-neutral-600">{error.message || 'An unexpected error occurred'}</p>
          </div>
        ) : customTable ? (
          customTable
        ) : (
          <DataTable
            columns={columns || []}
            data={data || []}
            loading={isLoading}
            onRowClick={onRowClick}
          />
        )}
        {afterTable}
      </div>
    </DashboardLayout>
  );
}

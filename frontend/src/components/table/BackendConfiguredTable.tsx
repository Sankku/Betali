import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../ui/data-table';
import { GenericCell } from './GenericCell';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';
import { ApiTableConfigResponse } from '../../services/api/tableConfigService';

interface BackendConfiguredTableProps<T = any> {
  config: ApiTableConfigResponse;
  data: T[];
  onAction?: (action: string, row: T, columnKey?: string) => void;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
}

const getColumnWidth = (columnConfig: any): number | undefined => {
  const key = columnConfig.key;
  const dataType = columnConfig.cellConfig?.dataType || columnConfig.dataType;

  if (key === 'reference') return 300;
  if (key === 'movement_type') return 120;
  if (key === 'quantity') return 100;
  if (key === 'movement_date' || key === 'created_at') return 140;
  if (key.includes('date')) return 140;

  switch (dataType) {
    case 'actions':
      return 120;
    case 'badge':
      return 120;
    case 'number':
    case 'currency':
    case 'percentage':
      return 100;
    case 'boolean':
      return 80;
    default:
      return undefined;
  }
};

export function BackendConfiguredTable<T extends Record<string, any>>({
  config,
  data,
  onAction,
  isLoading = false,
  onRowClick,
}: BackendConfiguredTableProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('');

  const columns: ColumnDef<T>[] = React.useMemo(() => {
    return config.config.columns.map((columnConfig: any) => {
      // For compound columns, we need a custom accessor that gets the primary field
      let accessorKey: keyof T | undefined;
      let sortingField: string | undefined;
      
      if (columnConfig.dataType === 'compound' && columnConfig.compoundConfig?.fields?.length > 0) {
        // Use the first field for sorting purposes
        sortingField = columnConfig.compoundConfig.fields[0].key;
        accessorKey = sortingField as keyof T;
      } else if (columnConfig.dataType === 'actions') {
        // Actions don't need an accessor
        accessorKey = undefined;
      } else {
        accessorKey = columnConfig.key as keyof T;
      }

      return {
        id: columnConfig.key, // Use key as unique identifier
        accessorKey,
        header: columnConfig.header,
        enableSorting: columnConfig.sortable ?? true,
        size: getColumnWidth(columnConfig),
        cell: ({ row }: { row: any; getValue?: any }) => {
          // For compound and actions, pass null as value since we access row data directly
          const value = (columnConfig.dataType === 'actions' || columnConfig.dataType === 'compound') 
            ? null 
            : row.original[columnConfig.key];

          return (
            <GenericCell
              value={value}
              row={row.original}
              config={columnConfig}
              onAction={(action: string, actionRow: any) =>
                onAction?.(action, actionRow, columnConfig.key)
              }
            />
          );
        },
      };
    });
  }, [config.config.columns, onAction]);

  const searchConfig = config.config?.search;
  const searchable = searchConfig?.enabled ?? false;
  const searchPlaceholder = searchConfig?.placeholder || 'Search...';
  const searchableColumns = searchConfig?.searchableColumns || [];

  const filteredData = useMemo(() => {
    if (!globalFilter || !searchable || searchableColumns.length === 0) {
      return data;
    }

    const filterValue = globalFilter.toLowerCase();
    return data.filter(row => {
      return searchableColumns.some((columnKey: string) => {
        const value = row[columnKey];
        if (value == null) return false;
        return String(value).toLowerCase().includes(filterValue);
      });
    });
  }, [data, globalFilter, searchable, searchableColumns]);

  const paginationConfig = config.config?.pagination;
  const enablePagination = paginationConfig?.enabled ?? true;
  const defaultPageSize = paginationConfig?.defaultPageSize ?? 10;

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-md">
            <Input
              type="text"
              icon={<Search className="h-4 w-4 text-neutral-600" />}
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
            />
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredData}
        loading={isLoading}
        onRowClick={onRowClick}
        searchable={false}
        enablePagination={enablePagination}
        pageSize={defaultPageSize}
        enableSorting={true}
        enableColumnFilters={false}
        enableColumnVisibility={false}
        emptyMessage="No data available"
      />
    </div>
  );
}

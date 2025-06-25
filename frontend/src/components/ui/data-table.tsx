import React, { useState, useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnDef,
  getPaginationRowModel,
  PaginationState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  ChevronUp,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  AlertCircle,
} from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Loading } from './loading';
import { cn } from '../../lib/utils';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKey?: string;
  pageSize?: number;
  enableSorting?: boolean;
  enablePagination?: boolean;
  enableColumnFilters?: boolean;
  enableColumnVisibility?: boolean;
  manualPagination?: boolean;
  pageCount?: number;
  onPaginationChange?: (pagination: PaginationState) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
}

export function DataTable<TData>({
  columns,
  data: rawData,
  loading = false,
  onRowClick,
  emptyMessage = 'No hay datos disponibles',
  className,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  searchKey,
  pageSize = 10,
  enableSorting = true,
  enablePagination = true,
  enableColumnFilters = true,
  enableColumnVisibility = false,
  manualPagination = false,
  pageCount,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const data = useMemo(() => {
    if (!rawData) {
      console.warn('DataTable: prop "data" is undefined, using empty array');
      return [];
    }
    if (!Array.isArray(rawData)) {
      console.error('DataTable: prop "data" must be an array, received:', typeof rawData);
      return [];
    }
    return rawData;
  }, [rawData]);

  const validatedColumns = useMemo(() => {
    if (!columns || !Array.isArray(columns)) {
      console.error('DataTable: prop "columns" must be an array');
      return [];
    }
    return columns;
  }, [columns]);

  const table = useReactTable({
    data,
    columns: validatedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableColumnFilters ? getFilteredRowModel() : undefined,
    onSortingChange: onSortingChange || setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: onColumnFiltersChange || setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: onPaginationChange || setPagination,
    manualPagination,
    pageCount: pageCount ?? -1,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      pagination,
    },
  });

  const handleRowClick = (row: TData, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const isButton = target.closest('button');
    const isLink = target.closest('a');
    const isInput = target.closest('input, select, textarea');

    if (!isButton && !isLink && !isInput && onRowClick) {
      onRowClick(row);
    }
  };

  if (!validatedColumns.length) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="flex items-center space-x-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <div>
            <h3 className="font-medium">Error de configuración</h3>
            <p className="text-sm">Las columnas de la tabla no están configuradas correctamente.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4 border-0 bg-none', className)}>
      {(searchable || enableColumnVisibility) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center space-x-2">
            {searchable && (
              <div className="relative max-w-sm">
                {searchKey ? (
                  <Input
                    icon={<Search className="h-4 w-4" />}
                    placeholder={searchPlaceholder}
                    value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
                    onChange={e => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <Input
                    icon={<Search className="h-4 w-4" />}
                    placeholder={searchPlaceholder}
                    value={globalFilter ?? ''}
                    onChange={e => setGlobalFilter(e.target.value)}
                    className="w-full"
                  />
                )}
              </div>
            )}
          </div>

          {enableColumnVisibility && (
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Columnas
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="bg-white rounded-lg border border-neutral-200 p-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <Loading size="sm" />
                  <span className="text-sm font-medium text-neutral-700">Cargando...</span>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-neutral-100">
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              'flex items-center space-x-1 transition-colors duration-200',
                              header.column.getCanSort() &&
                                'cursor-pointer select-none hover:text-primary-600'
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <span>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                            {header.column.getCanSort() && (
                              <div className="flex flex-col">
                                <ChevronUp
                                  className={cn(
                                    'h-3 w-3 transition-colors',
                                    header.column.getIsSorted() === 'asc'
                                      ? 'text-primary-600'
                                      : 'text-neutral-400'
                                  )}
                                />
                                <ChevronDown
                                  className={cn(
                                    'h-3 w-3 -mt-1 transition-colors',
                                    header.column.getIsSorted() === 'desc'
                                      ? 'text-primary-600'
                                      : 'text-neutral-400'
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={validatedColumns.length} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-neutral-100">
                          <Search className="h-6 w-6 text-neutral-400" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 mb-1">
                            {loading ? 'Cargando datos...' : 'No hay datos'}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {loading
                              ? 'Por favor espere mientras cargamos la información.'
                              : emptyMessage}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      onClick={e => handleRowClick(row.original, e)}
                      className={cn(
                        'transition-all duration-200 hover:bg-neutral-50',
                        onRowClick && 'cursor-pointer'
                      )}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 text-sm text-neutral-900">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {enablePagination && !loading && data.length > 0 && table.getPageCount() > 1 && (
          <div className="border-t border-neutral-200 px-6 py-4 bg-neutral-50/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-500">
                Mostrando{' '}
                <span className="font-medium text-neutral-900">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                </span>{' '}
                a{' '}
                <span className="font-medium text-neutral-900">
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) *
                      table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}
                </span>{' '}
                de{' '}
                <span className="font-medium text-neutral-900">
                  {table.getFilteredRowModel().rows.length}
                </span>{' '}
                resultados
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center space-x-1">
                  <span className="text-sm text-neutral-500">Página</span>
                  <span className="text-sm font-medium text-neutral-900">
                    {table.getState().pagination.pageIndex + 1}
                  </span>
                  <span className="text-sm text-neutral-500">de</span>
                  <span className="text-sm font-medium text-neutral-900">
                    {table.getPageCount()}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

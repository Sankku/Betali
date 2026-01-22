import React, { useState, useMemo, useRef } from 'react';
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
  RowSelectionState,
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
import { ColumnFilter } from './column-filter';
import { cn } from '../../lib/utils';
import { handleTableRowSelection, getLastSelectedItem } from '../../lib/utils/selection';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  onRowDoubleClick?: (row: TData) => void;
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
  enableRowSelection?: boolean;
  selectedRows?: TData[];
  onSelectionChange?: (selectedRows: TData[]) => void;
  getRowId?: (row: TData) => string;
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
  onRowDoubleClick,
  emptyMessage = 'No data available',
  className,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchKey,
  pageSize = 10,
  enableSorting = true,
  enablePagination = true,
  enableColumnFilters = true,
  enableColumnVisibility = false,
  enableRowSelection = false,
  selectedRows = [],
  onSelectionChange,
  getRowId,
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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const lastSelectedItemRef = useRef<TData | null>(null);

  const data = useMemo(() => {
    if (!rawData) {
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
    
    // Add selection column if row selection is enabled
    if (enableRowSelection) {
      const selectionColumn = {
        id: 'select',
        header: ({ table }: any) => (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 cursor-pointer"
              style={{ accentColor: 'rgb(14 116 144)' }}
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={table.getIsSomePageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ),
        cell: ({ row }: any) => {
          const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            e.stopPropagation();
            const isChecked = e.target.checked;
            const currentIds = (selectedRows || []).map(getRowId!);
            const rowId = getRowId!(row.original);

            let newSelection: typeof selectedRows;
            if (isChecked) {
              // Add to selection if not already there
              if (!currentIds.includes(rowId)) {
                newSelection = [...(selectedRows || []), row.original];
              } else {
                newSelection = selectedRows || [];
              }
            } else {
              // Remove from selection
              newSelection = (selectedRows || []).filter(item => getRowId!(item) !== rowId);
            }

            onSelectionChange?.(newSelection);
          };

          return (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                style={{ accentColor: 'rgb(14 116 144)' }}
                checked={row.getIsSelected()}
                onChange={handleCheckboxChange}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      };
      return [selectionColumn, ...columns];
    }
    
    return columns;
  }, [columns, enableRowSelection, selectedRows, getRowId, onSelectionChange]);

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
    onRowSelectionChange: setRowSelection,
    onPaginationChange: onPaginationChange || setPagination,
    enableRowSelection: enableRowSelection,
    getRowId: getRowId,
    manualPagination,
    pageCount: pageCount ?? -1,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  // Sync selectedRows prop to internal rowSelection state
  React.useEffect(() => {
    if (enableRowSelection && selectedRows && getRowId) {
      const selectedIds = selectedRows.map(getRowId);
      const newRowSelection: RowSelectionState = {};

      data.forEach((item) => {
        const itemId = getRowId(item);
        if (selectedIds.includes(itemId)) {
          newRowSelection[itemId] = true;
        }
      });

      setRowSelection(newRowSelection);
    }
  }, [selectedRows, data, enableRowSelection, getRowId]);

  const handleRowClick = (row: any, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    // Don't trigger row click if we're clicking on interactive elements
    if (target.closest('.data-table-no-click')) {
      return;
    }

    // Check if clicking on or inside interactive elements
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('[role="button"]') ||
      target.closest('[data-radix-collection-item]') ||
      target.hasAttribute('data-radix-collection-item')
    ) {
      return;
    }

    // If row selection is enabled and no custom onRowClick, handle selection with our custom logic
    if (enableRowSelection && !onRowClick && onSelectionChange && getRowId) {
      const newSelection = handleTableRowSelection({
        currentSelection: selectedRows || [],
        clickedItem: row.original,
        allItems: data,
        lastSelectedItem: lastSelectedItemRef.current,
        isCtrlKey: event.ctrlKey || event.metaKey, // Support both Ctrl (Windows/Linux) and Cmd (Mac)
        getItemId: getRowId,
      });

      // Update last selected item
      lastSelectedItemRef.current = row.original;

      // Notify parent of selection change
      onSelectionChange(newSelection);
      return;
    }

    if (onRowClick) {
      onRowClick(row.original);
    }
  };

  const handleRowDoubleClick = (row: any, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    // Don't trigger row double click if we're clicking on interactive elements
    if (target.closest('.data-table-no-click')) {
      return;
    }

    // Check if clicking on or inside interactive elements
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('[role="button"]') ||
      target.closest('[data-radix-collection-item]') ||
      target.hasAttribute('data-radix-collection-item')
    ) {
      return;
    }

    if (onRowDoubleClick) {
      onRowDoubleClick(row.original);
    }
  };

  if (!validatedColumns.length) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="flex items-center space-x-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <div>
            <h3 className="font-medium">Configuration Error</h3>
            <p className="text-sm">Table columns are not configured correctly.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-neutral-200/50 shadow-2xl shadow-neutral-900/10 overflow-hidden">
        {(searchable || enableColumnVisibility) && (
          <div className="border-b border-neutral-200/50 bg-gradient-to-r from-neutral-50/50 to-white/70 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-1 items-center space-x-3">
                {searchable && (
                  <div className="relative flex-1 max-w-md">
                    {searchKey ? (
                      <Input
                        type="text"
                        icon={<Search className="h-4 w-4 text-neutral-600" />}
                        placeholder={searchPlaceholder}
                        value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
                        onChange={e => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
                      />
                    ) : (
                      <Input
                        type="text"
                        icon={<Search className="h-4 w-4 text-neutral-600" />}
                        placeholder={searchPlaceholder}
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>

              {enableColumnVisibility && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/70 backdrop-blur-sm border-neutral-300/60 hover:bg-white/90 text-neutral-700 hover:text-neutral-900 transition-all duration-200"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Columns
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/85 backdrop-blur-sm">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200/60 shadow-xl px-6 py-4">
                <div className="flex items-center space-x-3">
                  <Loading size="sm" className="text-primary-600" />
                  <span className="text-sm font-medium text-neutral-800">Loading data...</span>
                </div>
              </div>
            </div>
          )}
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  {table.getHeaderGroups().map((headerGroup, index) => (
                    <tr
                      key={headerGroup.id}
                      className={cn(
                        'border-b border-neutral-200/60',
                        index === 0 && 'bg-gradient-to-r from-neutral-100/60 to-white/40'
                      )}
                    >
                      {headerGroup.headers.map((header, index) => {
                        const hasFilter = header.column.getFilterValue();
                        return (
                        <th
                          key={header.id}
                          className={cn(
                            "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider transition-colors",
                            index !== headerGroup.headers.length - 1 && "border-r border-neutral-200",
                            hasFilter
                              ? "bg-primary-50/50 text-primary-900 border-b-2 border-b-primary-600"
                              : "text-neutral-700"
                          )}
                        >
                          {header.isPlaceholder ? null : (
                            <div className="flex items-center justify-between gap-2">
                              <div
                                className={cn(
                                  'flex items-center space-x-1 transition-all duration-200',
                                  header.column.getCanSort() &&
                                    'cursor-pointer select-none hover:text-primary-600 group'
                                )}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                <span className="group-hover:translate-x-0.5 transition-transform duration-200 text-neutral-800">
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                </span>
                                {header.column.getCanSort() && (
                                  <div className="flex flex-col opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                                    <ChevronUp
                                      className={cn(
                                        'h-3 w-3 transition-all duration-200',
                                        header.column.getIsSorted() === 'asc'
                                          ? 'text-primary-600 scale-110'
                                          : 'text-neutral-500'
                                      )}
                                    />
                                    <ChevronDown
                                      className={cn(
                                        'h-3 w-3 -mt-1 transition-all duration-200',
                                        header.column.getIsSorted() === 'desc'
                                          ? 'text-primary-600 scale-110'
                                          : 'text-neutral-500'
                                      )}
                                    />
                                  </div>
                                )}
                              </div>
                              {/* Column Filter */}
                              {enableColumnFilters && header.column.getCanFilter() && header.id !== 'select' && (
                                <ColumnFilter
                                  value={(header.column.getFilterValue() as string) ?? ''}
                                  onChange={(value) => header.column.setFilterValue(value)}
                                  placeholder={`Filter ${header.column.columnDef.header}...`}
                                  filterType={(header.column.columnDef.meta as any)?.filterType || 'text'}
                                  options={(header.column.columnDef.meta as any)?.filterOptions || []}
                                />
                              )}
                            </div>
                          )}
                        </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>

                <tbody className="divide-y divide-neutral-200/60">
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={validatedColumns.length} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-50 border border-neutral-200">
                            <Search className="h-8 w-8 text-neutral-500" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-lg font-semibold text-neutral-800">
                              {loading ? 'Loading data...' : 'No data available'}
                            </p>
                            <p className="text-sm text-neutral-600 max-w-md">
                              {loading
                                ? 'Please wait while we load the information.'
                                : emptyMessage}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row, index) => {
                      const isSelected = row.getIsSelected();
                      return (
                      <tr
                        key={row.id}
                        onClick={e => handleRowClick(row, e)}
                        onDoubleClick={e => handleRowDoubleClick(row, e)}
                        style={isSelected ? { boxShadow: 'inset 4px 0 0 0 rgb(14 116 144)' } : undefined}
                        className={cn(
                          'transition-all duration-200 group',
                          (onRowClick || onRowDoubleClick || enableRowSelection) && 'cursor-pointer',
                          isSelected
                            ? 'bg-teal-50/70 hover:bg-teal-50'
                            : cn(
                                'hover:bg-primary-50/40 hover:backdrop-blur-sm',
                                index % 2 === 0 ? 'bg-white/30' : 'bg-white/15'
                              )
                        )}
                      >
                        {row.getVisibleCells().map((cell, cellIndex) => (
                          <td
                            key={cell.id}
                            className={cn(
                              "px-4 py-3 text-sm text-neutral-800 group-hover:text-neutral-900 transition-colors duration-200",
                              cellIndex !== row.getVisibleCells().length - 1 && "border-r border-neutral-200/60"
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {pagination && (
          <div className="border-t border-neutral-200/60 bg-gradient-to-r from-neutral-100/50 to-white/60 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-700">
                Showing{' '}
                <span className="font-semibold text-neutral-900">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                </span>
                {' to '}
                <span className="font-semibold text-neutral-900">
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) *
                      table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}
                </span>
                {' of '}
                <span className="font-semibold text-neutral-900">
                  {table.getFilteredRowModel().rows.length}
                </span>
                {' results'}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="bg-white/70 backdrop-blur-sm border-neutral-300/60 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-neutral-700 hover:text-neutral-900"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="bg-white/70 backdrop-blur-sm border-neutral-300/60 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-neutral-700 hover:text-neutral-900"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-lg border border-neutral-300/60">
                  <span className="text-sm text-neutral-700">Page</span>
                  <span className="text-sm font-semibold text-neutral-900">
                    {table.getState().pagination.pageIndex + 1}
                  </span>
                  <span className="text-sm text-neutral-700">of</span>
                  <span className="text-sm font-semibold text-neutral-900">
                    {table.getPageCount()}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="bg-white/70 backdrop-blur-sm border-neutral-300/60 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-neutral-700 hover:text-neutral-900"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="bg-white/70 backdrop-blur-sm border-neutral-300/60 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-neutral-700 hover:text-neutral-900"
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

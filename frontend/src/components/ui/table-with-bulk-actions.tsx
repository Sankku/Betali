import React, { useState, useCallback, useEffect } from 'react';
import { CheckSquare, Plus, Lock } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { DataTable } from './data-table';
import { cn } from '@/lib/utils';

export interface BulkAction<T = any> {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost';
  colorScheme?: {
    bg: string;
    border: string;
    text: string;
    hoverBg: string;
  };
  onClick: (selectedItems: T[]) => void;
  isDisabled?: (selectedItems: T[]) => boolean;
  getValidItems?: (selectedItems: T[]) => T[];
  showCount?: boolean;
  alwaysShow?: boolean; // Show even when no items selected
}

export interface TableWithBulkActionsProps<T = any> {
  // Data
  data: T[];
  columns: any[];
  loading?: boolean;

  // Selection
  getRowId: (row: T) => string;
  onSelectionChange?: (selectedRows: T[]) => void;

  // Bulk Actions
  bulkActions?: BulkAction<T>[];

  // Create button
  createButtonLabel?: string;
  onCreateClick?: () => void;
  createButtonId?: string;

  // Table options
  searchable?: boolean; // Global search (deprecated, use column filters instead)
  enableColumnFilters?: boolean; // Enable per-column filters
  enablePagination?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  onRowDoubleClick?: (row: T) => void;

  // Filter/Search components (optional)
  filterComponents?: React.ReactNode;

  // Custom toolbar content
  customToolbarLeft?: (selectedItems: T[]) => React.ReactNode;
  customToolbarRight?: (selectedItems: T[]) => React.ReactNode;

  // Limit enforcement
  createButtonDisabled?: boolean;
  createButtonTooltip?: string;

  // Additional Table Options
  paginationPosition?: 'top' | 'bottom' | 'both';
  enableInfiniteScroll?: boolean;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

interface LimitAwareCreateButtonProps {
  id?: string;
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
}

function LimitAwareCreateButton({ id, label = 'New Item', onClick, disabled, tooltip }: LimitAwareCreateButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!disabled) {
    return (
      <Button id={id} onClick={onClick} className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-white" />
        {label}
      </Button>
    );
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Button
        id={id}
        disabled
        className="flex items-center gap-2 opacity-50 cursor-not-allowed pointer-events-none"
      >
        <Lock className="h-4 w-4 text-white" />
        {label}
      </Button>
      {showTooltip && tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

export function TableWithBulkActions<T = any>({
  data,
  columns,
  loading = false,
  getRowId,
  onSelectionChange,
  bulkActions = [],
  createButtonLabel = 'New Item',
  onCreateClick,
  createButtonId,
  searchable = false, // Disabled by default, use column filters instead
  enableColumnFilters = true, // Enabled by default
  enablePagination = true,
  pageSize = 20,
  emptyMessage = 'No items found.',
  onRowDoubleClick,
  filterComponents,
  customToolbarLeft,
  customToolbarRight,
  createButtonDisabled = false,
  createButtonTooltip,
  paginationPosition = 'both',
  enableInfiniteScroll,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: TableWithBulkActionsProps<T>) {
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  // Handle selection changes
  const handleSelectionChange = useCallback((selected: T[]) => {
    setSelectedItems(selected);
    onSelectionChange?.(selected);
  }, [onSelectionChange]);

  // When data changes, keep selections that still exist (re-mapped to new row objects)
  // so that refetches after bulk actions don't silently deselect rows.
  useEffect(() => {
    setSelectedItems((prev) => {
      if (prev.length === 0) return prev;
      const dataById = new Map(data.map((row) => [getRowId(row), row]));
      const next = prev.reduce<T[]>((acc, item) => {
        const fresh = dataById.get(getRowId(item));
        if (fresh) acc.push(fresh);
        return acc;
      }, []);
      return next.length === prev.length ? next : next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Get valid items for a specific action
  const getValidItemsForAction = useCallback((action: BulkAction<T>) => {
    if (action.getValidItems) {
      return action.getValidItems(selectedItems);
    }
    return selectedItems;
  }, [selectedItems]);

  const hasSelection = selectedItems.length > 0;

  return (
    <div className="space-y-4">
      {/* Filters Card (if provided) */}
      {filterComponents && (
        <Card>
          <CardContent className="pt-6">
            {filterComponents}
          </CardContent>
        </Card>
      )}

      {/* Toolbar Card */}
      <Card>
        <CardContent className="pt-6">
          <div className={cn(
            "flex items-center justify-between px-4 py-3 rounded-lg border transition-colors min-h-[60px]",
            hasSelection
              ? "bg-blue-50 border-blue-200"
              : "bg-gray-50 border-gray-200"
          )}>
            {hasSelection ? (
              <>
                {/* Left side - Selection info */}
                <div className="flex items-center gap-2">
                  {customToolbarLeft ? (
                    customToolbarLeft(selectedItems)
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        {selectedItems.length} selected
                      </span>
                    </>
                  )}
                </div>

                {/* Right side - Bulk actions */}
                <div className="flex gap-2 flex-wrap">
                  {bulkActions.map((action) => {
                    const validItems = getValidItemsForAction(action);
                    const shouldShow = validItems.length > 0 || action.alwaysShow;
                    const isDisabled = action.isDisabled?.(selectedItems) ?? false;

                    if (!shouldShow) return null;

                    const Icon = action.icon;
                    const colorScheme = action.colorScheme || {
                      bg: 'bg-white',
                      border: 'border-gray-300',
                      text: 'text-gray-700',
                      hoverBg: 'hover:bg-gray-50'
                    };

                    return (
                      <Button
                        key={action.key}
                        variant="outline"
                        onClick={() => action.onClick(validItems)}
                        disabled={isDisabled}
                        className={cn(
                          "flex items-center gap-2",
                          colorScheme.bg,
                          colorScheme.border,
                          colorScheme.text,
                          colorScheme.hoverBg
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {action.label}
                        {action.showCount !== false && validItems.length > 0 && (
                          <span className="ml-1">({validItems.length})</span>
                        )}
                      </Button>
                    );
                  })}

                  {/* Create button when items selected */}
                  {onCreateClick && (
                    <LimitAwareCreateButton
                      id={createButtonId}
                      label={createButtonLabel}
                      onClick={onCreateClick}
                      disabled={createButtonDisabled}
                      tooltip={createButtonTooltip}
                    />
                  )}

                  {customToolbarRight && customToolbarRight(selectedItems)}
                </div>
              </>
            ) : (
              <>
                {/* No selection - show create button */}
                <div className="w-full flex justify-between items-center">
                  {customToolbarLeft ? (
                    customToolbarLeft([])
                  ) : (
                    <div /> // Empty div for spacing
                  )}

                  <div className="flex gap-2">
                    {customToolbarRight && customToolbarRight([])}

                    {onCreateClick && (
                      <LimitAwareCreateButton
                        id={createButtonId}
                        label={createButtonLabel}
                        onClick={onCreateClick}
                        disabled={createButtonDisabled}
                        tooltip={createButtonTooltip}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            searchable={searchable}
            enableColumnFilters={enableColumnFilters}
            enablePagination={enablePagination}
            enableRowSelection={true}
            selectedRows={selectedItems}
            onSelectionChange={handleSelectionChange}
            getRowId={getRowId}
            pageSize={pageSize}
            onRowDoubleClick={onRowDoubleClick}
            emptyMessage={emptyMessage}
            paginationPosition={paginationPosition}
            enableInfiniteScroll={enableInfiniteScroll}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}

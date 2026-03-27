import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Filter, X } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { DatePicker } from './date-picker';
import { DateRangePicker, DateRange } from './date-range-picker';

interface ColumnFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filterType?: 'text' | 'number' | 'date' | 'dateRange' | 'select';
  options?: { label: string; value: string }[];
}

export function ColumnFilter({
  value,
  onChange,
  placeholder = 'Filter...',
  filterType = 'text',
  options = [],
}: ColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterValue, setFilterValue] = useState(value || '');
  const [dateValue, setDateValue] = useState<Date | undefined>(value ? new Date(value) : undefined);
  const [dateRangeValue, setDateRangeValue] = useState<DateRange>(() => {
    if (value && value.includes('|')) {
      const [from, to] = value.split('|');
      return { from: new Date(from), to: new Date(to) };
    }
    return { from: undefined, to: undefined };
  });
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal state with external value
  useEffect(() => {
    if (filterType === 'date' && value) {
      setDateValue(new Date(value));
    } else if (filterType === 'dateRange' && value && value.includes('|')) {
      const [from, to] = value.split('|');
      setDateRangeValue({ from: new Date(from), to: new Date(to) });
    } else {
      setFilterValue(value || '');
    }
  }, [value, filterType]);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  // Note: Skip this for date/dateRange types because they use portals and handle their own closing
  useEffect(() => {
    // Skip click-outside handling for date pickers (they use portals)
    if (filterType === 'date' || filterType === 'dateRange') {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, filterType]);

  const handleApply = () => {
    if (filterType === 'date' && dateValue) {
      onChange(dateValue.toISOString());
    } else if (filterType === 'dateRange' && dateRangeValue.from && dateRangeValue.to) {
      onChange(`${dateRangeValue.from.toISOString()}|${dateRangeValue.to.toISOString()}`);
    } else {
      onChange(filterValue);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilterValue('');
    setDateValue(undefined);
    setDateRangeValue({ from: undefined, to: undefined });
    onChange('');
    setIsOpen(false);
  };

  const handleDateChange = (date: Date | undefined) => {
    setDateValue(date);
    if (date) {
      const isoValue = date.toISOString();
      onChange(isoValue);
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range && range.from && range.to) {
      setDateRangeValue(range);
      const filterValue = `${range.from.toISOString()}|${range.to.toISOString()}`;
      onChange(filterValue);
    } else {
      setDateRangeValue({ from: undefined, to: undefined });
      onChange('');
    }
    setIsOpen(false);
  };

  const hasActiveFilter = value && value.length > 0;

  const dropdownContent = isOpen ? (
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-xl min-w-[200px] p-3"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        zIndex: 10000,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="space-y-2">
        {filterType === 'date' ? (
          <div className="min-w-[320px]">
            <DatePicker
              value={dateValue}
              onChange={handleDateChange}
              placeholder={placeholder}
            />
          </div>
        ) : filterType === 'dateRange' ? (
          <div className="min-w-[360px]">
            <DateRangePicker
              value={dateRangeValue}
              onChange={handleDateRangeChange}
              placeholder={placeholder}
            />
          </div>
        ) : filterType === 'select' ? (
          <select
            value={filterValue}
            onChange={e => {
              const val = e.target.value;
              setFilterValue(val);
              onChange(val);
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          >
            {!options.some((o) => o.value === '') && (
              <option value="">Todos</option>
            )}
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <>
            <Input
              type={(filterType as string) === 'date' || (filterType as string) === 'dateRange' ? 'text' : (filterType as string)}
              value={filterValue}
              onChange={e => setFilterValue(e.target.value)}
              placeholder={placeholder}
              className="text-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleApply();
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClear}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
              <Button type="button" size="sm" onClick={handleApply} className="text-xs">
                Apply
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={e => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          'relative p-1.5 rounded transition-all',
          hasActiveFilter
            ? 'bg-primary-600 hover:bg-primary-700 shadow-sm'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        )}
        title={hasActiveFilter ? 'Filter active - Click to edit' : 'Filter column'}
      >
        <Filter className={cn('h-4 w-4', hasActiveFilter && 'text-white')} />
        {hasActiveFilter && (
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-success-500 rounded-full border border-white" />
        )}
      </button>

      {isOpen && createPortal(dropdownContent, document.body)}
    </>
  );
}

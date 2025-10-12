import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, X, ArrowRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select date range',
  minDate,
  maxDate,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(value || { from: undefined, to: undefined });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<Date | undefined>();
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      setRange(value);
    }
  }, [value]);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDateClick = (day: number) => {
    console.log('[DateRangePicker] handleDateClick called with day:', day);
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    console.log('[DateRangePicker] Clicked date:', clickedDate);
    console.log('[DateRangePicker] Current range:', range);

    if (!range.from || (range.from && range.to)) {
      // Start new range
      console.log('[DateRangePicker] Starting new range');
      setRange({ from: clickedDate, to: undefined });
    } else if (clickedDate < range.from) {
      // Clicked date is before start, make it the new start
      console.log('[DateRangePicker] Clicked before start, swapping');
      setRange({ from: clickedDate, to: range.from });
      onChange({ from: clickedDate, to: range.from });
      setIsOpen(false);
    } else {
      // Complete the range
      console.log('[DateRangePicker] Completing range');
      setRange({ from: range.from, to: clickedDate });
      onChange({ from: range.from, to: clickedDate });
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRange({ from: undefined, to: undefined });
    onChange(undefined);
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isInRange = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!range.from) return false;

    const compareDate = range.to || hoverDate;
    if (!compareDate) return false;

    return date >= range.from && date <= compareDate;
  };

  const isRangeStart = (day: number) => {
    if (!range.from) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return (
      date.getFullYear() === range.from.getFullYear() &&
      date.getMonth() === range.from.getMonth() &&
      date.getDate() === range.from.getDate()
    );
  };

  const isRangeEnd = (day: number) => {
    if (!range.to) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return (
      date.getFullYear() === range.to.getFullYear() &&
      date.getMonth() === range.to.getMonth() &&
      date.getDate() === range.to.getDate()
    );
  };

  const formatDisplayDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const displayText = () => {
    if (!range.from && !range.to) return placeholder;
    if (range.from && !range.to) return `${formatDisplayDate(range.from)} - ...`;
    return `${formatDisplayDate(range.from)} - ${formatDisplayDate(range.to)}`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleQuickRange = (days: number) => {
    console.log('[DateRangePicker] handleQuickRange called with days:', days);
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - days);
    console.log('[DateRangePicker] Quick range:', { from, to: today });
    setRange({ from, to: today });
    console.log('[DateRangePicker] Calling onChange with range');
    onChange({ from, to: today });
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const disabled = isDateDisabled(day);
      const inRange = isInRange(day);
      const isStart = isRangeStart(day);
      const isEnd = isRangeEnd(day);

      days.push(
        <button
          type="button"
          key={day}
          onClick={() => !disabled && handleDateClick(day)}
          onMouseEnter={() => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            setHoverDate(date);
          }}
          onMouseLeave={() => setHoverDate(undefined)}
          disabled={disabled}
          className={cn(
            'p-2 text-sm rounded-md transition-colors relative',
            disabled && 'opacity-30 cursor-not-allowed',
            !disabled && !isStart && !isEnd && 'hover:bg-gray-100',
            inRange && !isStart && !isEnd && 'bg-primary-50',
            (isStart || isEnd) && 'bg-primary-600 text-white font-semibold hover:bg-primary-700'
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const dropdownContent = (
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 p-4"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: '360px',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={previousMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(name => (
          <div key={name} className="text-center text-xs font-medium text-gray-500 p-2">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendar()}
      </div>

      {/* Quick ranges */}
      <div className="mt-4 pt-3 border-t space-y-2">
        <div className="text-xs font-medium text-gray-600 mb-2">Quick ranges:</div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickRange(7)}
            className="text-xs"
          >
            Last 7 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickRange(30)}
            className="text-xs"
          >
            Last 30 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickRange(90)}
            className="text-xs"
          >
            Last 90 days
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              setRange({ from: firstDayOfMonth, to: today });
              onChange({ from: firstDayOfMonth, to: today });
              setIsOpen(false);
            }}
            className="flex-1 text-xs"
          >
            This month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRange({ from: undefined, to: undefined });
              onChange(undefined);
              setIsOpen(false);
            }}
            className="flex-1 text-xs"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:border-gray-400 transition-colors bg-white',
          className
        )}
      >
        <span className={cn('flex items-center gap-2', !range.from && !range.to && 'text-gray-500')}>
          <CalendarIcon className="h-4 w-4" />
          {displayText()}
        </span>
        {(range.from || range.to) && (
          <X
            className="h-4 w-4 text-gray-400 hover:text-gray-600"
            onClick={handleClear}
          />
        )}
      </button>
      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          {dropdownContent}
        </>,
        document.body
      )}
    </>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

const CALENDAR_HEIGHT = 360;
const CALENDAR_WIDTH = 320;
const GAP = 4;

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
  className,
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const [dropdownPosition, setDropdownPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    openUpward: boolean;
  }>({ top: 0, left: 0, openUpward: false });
  const [manualInput, setManualInput] = useState('');
  const [manualInputError, setManualInputError] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < CALENDAR_HEIGHT + GAP && spaceAbove > spaceBelow;

      setDropdownPosition({
        top: openUpward ? undefined : rect.bottom + window.scrollY + GAP,
        bottom: openUpward ? window.innerHeight - rect.top + window.scrollY + GAP : undefined,
        left: Math.min(rect.left + window.scrollX, window.innerWidth - CALENDAR_WIDTH - 8),
        openUpward,
      });

      // Sync manual input with current value
      setManualInput(selectedDate ? formatInputDate(selectedDate) : '');
      setManualInputError(false);

      setTimeout(() => manualInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedDate(value);
    if (value) setCurrentMonth(value);
  }, [value]);

  const formatInputDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseManualInput = (input: string): Date | null => {
    // Accepts DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
    const normalized = input.trim();
    let parts: string[] = [];

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      parts = normalized.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return isNaN(d.getTime()) ? null : d;
    }

    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(normalized)) {
      parts = normalized.split(/[\/\-]/);
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setManualInput(val);
    setManualInputError(false);

    const parsed = parseManualInput(val);
    if (parsed) {
      setSelectedDate(parsed);
      setCurrentMonth(parsed);
    }
  };

  const handleManualInputBlur = () => {
    if (!manualInput) return;
    const parsed = parseManualInput(manualInput);
    if (!parsed) {
      setManualInputError(true);
    } else {
      setManualInputError(false);
      onChange(parsed);
    }
  };

  const handleManualInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const parsed = parseManualInput(manualInput);
      if (parsed) {
        onChange(parsed);
        setIsOpen(false);
      } else {
        setManualInputError(true);
      }
    }
    if (e.key === 'Escape') setIsOpen(false);
  };

  const daysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const firstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    onChange(newDate);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(undefined);
    onChange(undefined);
  };

  const previousMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));

  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      currentMonth.getFullYear() === today.getFullYear() &&
      currentMonth.getMonth() === today.getMonth() &&
      day === today.getDate()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      currentMonth.getFullYear() === selectedDate.getFullYear() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      day === selectedDate.getDate()
    );
  };

  const formatDisplayDate = (date: Date | undefined) => {
    if (!date) return placeholder;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderCalendar = () => {
    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const disabled = isDateDisabled(day);
      const today = isToday(day);
      const selected = isSelected(day);

      days.push(
        <button
          type="button"
          key={day}
          onClick={() => !disabled && handleDateSelect(day)}
          disabled={disabled}
          className={cn(
            'p-2 text-sm rounded-md hover:bg-gray-100 transition-colors',
            disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent',
            today && !selected && 'bg-blue-50 text-blue-600 font-semibold',
            selected && 'bg-primary-600 text-white hover:bg-primary-700'
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const positionStyle: React.CSSProperties = {
    width: CALENDAR_WIDTH,
    left: dropdownPosition.left,
    ...(dropdownPosition.openUpward
      ? { bottom: dropdownPosition.bottom }
      : { top: dropdownPosition.top }),
  };

  const dropdownContent = (
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 p-4"
      style={positionStyle}
      onClick={e => e.stopPropagation()}
    >
      {/* Manual input */}
      <div className="mb-3">
        <input
          ref={manualInputRef}
          type="text"
          value={manualInput}
          onChange={handleManualInputChange}
          onBlur={handleManualInputBlur}
          onKeyDown={handleManualInputKeyDown}
          placeholder="DD/MM/YYYY"
          className={cn(
            'w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
            manualInputError ? 'border-red-400 text-red-600' : 'border-gray-300'
          )}
        />
        {manualInputError && (
          <p className="text-xs text-red-500 mt-1">Formato inválido. Usá DD/MM/YYYY</p>
        )}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={previousMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
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

      {/* Quick actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date();
            setSelectedDate(today);
            onChange(today);
            setIsOpen(false);
          }}
          className="flex-1 text-xs"
        >
          Hoy
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedDate(undefined);
            onChange(undefined);
            setIsOpen(false);
          }}
          className="flex-1 text-xs"
        >
          Limpiar
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-md transition-colors bg-white',
          disabled ? 'opacity-50 cursor-not-allowed bg-neutral-50' : 'hover:border-gray-400',
          className
        )}
      >
        <span className={cn('flex items-center gap-2', !selectedDate && 'text-gray-500')}>
          <CalendarIcon className="h-4 w-4" />
          {formatDisplayDate(selectedDate)}
        </span>
        {selectedDate && !disabled && (
          <X
            className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
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

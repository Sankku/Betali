import React from 'react';
import { Calendar } from 'lucide-react';
import { useDateFormat, DateFormatPattern } from '../../../contexts/DateFormatContext';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

const DATE_FORMAT_OPTIONS: { value: DateFormatPattern; label: string; example: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '31-12-2024' },
  { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY', example: '12-31-2024' },
];

interface DateFormatSelectorProps {
  compact?: boolean;
}

export function DateFormatSelector({ compact = false }: DateFormatSelectorProps) {
  const { datePattern, setDatePattern, formatDate } = useDateFormat();

  const currentOption = DATE_FORMAT_OPTIONS.find(opt => opt.value === datePattern) || DATE_FORMAT_OPTIONS[0];
  const preview = formatDate(new Date());

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <Select value={datePattern} onValueChange={value => setDatePattern(value as DateFormatPattern)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMAT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label} <span className="text-gray-500 ml-2">({option.example})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Date Format
      </Label>
      <Select value={datePattern} onValueChange={value => setDatePattern(value as DateFormatPattern)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_FORMAT_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center justify-between w-full">
                <span>{option.label}</span>
                <span className="text-gray-500 text-xs ml-4">{option.example}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-600 mb-1">Preview with current date:</p>
        <p className="text-lg font-semibold text-gray-900 tabular-nums">{preview}</p>
      </div>
    </div>
  );
}

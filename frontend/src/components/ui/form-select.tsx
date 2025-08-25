import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface FormSelectProps {
  label: string;
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  description?: string;
  icon?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function FormSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Seleccionar opción",
  description,
  icon,
  required = false,
  disabled = false,
  error,
  className = ""
}: FormSelectProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-semibold text-neutral-800 flex items-center">
        {icon && <span className="text-neutral-600 mr-2">{icon}</span>}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-neutral-600">{description}</p>
      )}
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col space-y-1">
                <div className="font-semibold text-neutral-900">{option.label}</div>
                {option.description && (
                  <div className="text-xs text-neutral-600">{option.description}</div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
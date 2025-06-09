// src/components/ui/select.tsx
"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  success?: boolean;
  icon?: React.ReactNode;
  label?: string;
  helpText?: string;
  showLabel?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      error,
      success,
      children,
      icon,
      label,
      helpText,
      showLabel = true,
      required,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && showLabel && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              {icon}
            </div>
          )}
          <select
            className={cn(
              "flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-10",
              icon && "pl-10",
              error
                ? "border-red-300 bg-red-50 focus-visible:ring-red-500 text-red-900 placeholder-red-300"
                : success
                ? "border-green-300 bg-green-50 focus-visible:ring-green-500 text-green-900"
                : "border-gray-300 bg-white hover:border-gray-400 focus-visible:ring-green-500",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
            <ChevronDown className="h-4 w-4" />
          </div>

          {/* Indicadores de validación */}
          {success && !error && (
            <div className="pointer-events-none absolute inset-y-0 right-8 flex items-center">
              <Check className="h-4 w-4 text-green-500" />
            </div>
          )}
        </div>

        {/* Mensajes de error o ayuda */}
        {error && typeof error === "string" && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {!error && helpText && (
          <p className="mt-1 text-xs text-gray-500">{helpText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

interface SelectItemProps
  extends React.OptionHTMLAttributes<HTMLOptionElement> {}

const SelectItem = React.forwardRef<HTMLOptionElement, SelectItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <option
        className={cn("py-1.5 px-2 text-sm", className)}
        ref={ref}
        {...props}
      >
        {children}
      </option>
    );
  }
);

SelectItem.displayName = "SelectItem";

interface SelectGroupProps
  extends React.OptgroupHTMLAttributes<HTMLOptGroupElement> {}

const SelectGroup = React.forwardRef<HTMLOptGroupElement, SelectGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <optgroup
        className={cn("py-1.5 px-2 text-sm font-semibold", className)}
        ref={ref}
        {...props}
      >
        {children}
      </optgroup>
    );
  }
);

SelectGroup.displayName = "SelectGroup";

export { Select, SelectItem, SelectGroup };

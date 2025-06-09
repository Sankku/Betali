"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
  success?: boolean;
  label?: string;
  helpText?: string;
  showLabel?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      error,
      success,
      label,
      helpText,
      showLabel = true,
      required,
      ...props
    },
    ref
  ) => {
    const isError = error === true || typeof error === "string";

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

        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border shadow-sm px-3 py-2 text-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
            isError
              ? "border-red-300 focus:ring-red-500 focus:border-red-300 bg-red-50"
              : success
              ? "border-green-300 focus:ring-green-500 focus:border-green-300 bg-green-50"
              : "border-gray-300 hover:border-gray-400 focus:ring-green-500 bg-white",
            className
          )}
          ref={ref}
          {...props}
        />

        {/* Mensaje de error o texto de ayuda */}
        {typeof error === "string" && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {!isError && helpText && (
          <p className="mt-1 text-xs text-gray-500">{helpText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };

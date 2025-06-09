"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: boolean | string;
  success?: boolean;
  helpText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, success, helpText, ...props }, ref) => {
    const isError = error === true || typeof error === "string";
    return (
      <div className="w-full relative">
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-10",
              isError
                ? "border-red-300 focus-visible:ring-red-500 focus-visible:border-red-300"
                : success
                ? "border-green-300 focus-visible:ring-green-500 focus-visible:border-green-500"
                : "border-gray-300 hover:border-gray-400 focus-visible:ring-green-500 focus-visible:border-green-500",
              className
            )}
            ref={ref}
            style={{ zIndex: 1 }}
            {...props}
          />

          {/* Indicadores de estado opcionales */}
          {success && !isError && (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center z-10">
              <svg
                className="h-5 w-5 text-green-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

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

Input.displayName = "Input";

export { Input };

"use client";

import * as React from "react";
import { cn } from "../../src/lib/utils";
import { AlertTriangle, CheckCircle, Info, XCircle, X } from "lucide-react";

type AlertVariant = "default" | "destructive" | "success" | "warning" | "info";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  onClose?: () => void;
}

const variantStyles: Record<AlertVariant, string> = {
  default: "bg-gray-50 text-gray-800 border-gray-200",
  destructive: "bg-red-50 text-red-800 border-red-200",
  success: "bg-green-50 text-green-800 border-green-200",
  warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
  info: "bg-blue-50 text-blue-800 border-blue-200",
};

const variantIcons: Record<AlertVariant, React.ReactNode> = {
  default: null,
  destructive: <XCircle className="h-5 w-5 text-red-500" />,
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, children, variant = "default", title, onClose, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative rounded-lg border p-4 mb-4",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <div className="flex items-start">
          {variantIcons[variant] && (
            <div className="flex-shrink-0 mr-3">{variantIcons[variant]}</div>
          )}
          <div className="flex-1">
            {title && <h3 className="text-sm font-medium mb-1">{title}</h3>}
            <div className="text-sm">{children}</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-auto -mr-1 -mt-1 bg-transparent text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 inline-flex h-8 w-8 items-center justify-center"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

export { Alert };

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { ModalFooterProps, ModalProps } from "./types";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "md",
  preventClose = false,
  closeOnEsc = true,
  closeOnOutsideClick = true,
}: ModalProps) {
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (closeOnEsc && isOpen && event.key === "Escape" && !preventClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose, closeOnEsc, preventClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    full: "max-w-full mx-4",
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOutsideClick && !preventClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div
        className="fixed inset-0 z-[101] bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
      ></div>

      <div className="flex min-h-screen items-center justify-center p-4 z-[102] relative">
        <div
          className={`relative bg-white rounded-lg shadow-lg shadow-black/10 border border-gray-200/50 w-full ${maxWidthClasses[maxWidth]} mx-auto transform transition-all duration-300 ease-out z-[103]`}
          role="dialog"
          aria-modal="true"
        >
          {title && (
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200/70 rounded-t">
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
              {!preventClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          <div className="p-2 md:p-4">
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "calc(90vh - 180px)" }}
            >
              {children}
            </div>
          </div>

          {footer && (
            <div className="flex items-center justify-end p-4 md:p-6 border-t border-gray-200/70 rounded-b">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ModalFooter({
  onClose,
  onConfirm,
  closeText = "Cancelar",
  confirmText = "Crear",
  isLoading = false,
  showConfirm = true,
  variant = "primary",
}: ModalFooterProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        className="mr-3 min-w-[100px]"
        disabled={isLoading}
      >
        {closeText}
      </Button>

      {showConfirm && onConfirm && (
        <Button
          type="button"
          variant={variant === "danger" ? "destructive" : "default"}
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            "min-w-[100px]",
            variant === "primary" ? "bg-green-600 hover:bg-green-700" : ""
          )}
        >
          {isLoading ? "Procesando..." : confirmText}
        </Button>
      )}
    </>
  );
}

if (typeof document !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
    @keyframes modalEnter {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `;
  document.head.appendChild(styleEl);
}

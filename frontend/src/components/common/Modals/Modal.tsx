import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "../../ui/button";
import { ModalProps, ModalFooterProps } from "./types";

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
    full: "max-w-full mx-4",
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOutsideClick && !preventClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
        onClick={handleBackdropClick}
      ></div>

      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className={`relative bg-white rounded-lg shadow-xl w-full ${maxWidthClasses[maxWidth]} mx-auto`}
          role="dialog"
          aria-modal="true"
        >
          {title && (
            <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t">
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
              {!preventClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          <div className="p-4 md:p-5 space-y-4">{children}</div>
          {footer && (
            <div className="flex items-center justify-end p-4 md:p-5 border-t border-gray-200 rounded-b">
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
  confirmText = "Confirmar",
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
        className="mr-3"
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
        >
          {isLoading ? "Procesando..." : confirmText}
        </Button>
      )}
    </>
  );
}

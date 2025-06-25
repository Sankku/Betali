// frontend/src/components/ui/modal.tsx - VERSIÓN FINAL CORREGIDA
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}
interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}
interface ModalComponent extends React.FC<ModalProps> {
  Header: React.FC<ModalHeaderProps>;
  Body: React.FC<ModalBodyProps>;
  Footer: React.FC<ModalFooterProps>;
}

const ModalBase: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  //title,
  //description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  //showCloseButton = true,
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl mx-4',
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm transition-all duration-300 bg-neutral-900/50"
        onClick={handleOverlayClick}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            'bg-white relative w-full transform transition-all duration-300',
            'animate-slide-in-bottom rounded-2xl shadow-2xl border border-neutral-200',
            sizeClasses[size],
            className
          )}
          onClick={e => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  onClose,
  showCloseButton = true,
  className,
}) => (
  <div
    className={cn(
      'flex items-center justify-between border-b border-neutral-200 px-6 py-4',
      className
    )}
  >
    <div className="flex-1">{children}</div>
    {showCloseButton && onClose && (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        className="hover-lift text-neutral-500 hover:text-neutral-700"
      >
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>
);

const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => (
  <div className={cn('px-6 py-4', className)}>{children}</div>
);

const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => (
  <div
    className={cn(
      'flex items-center justify-end space-x-3 border-t border-neutral-200 px-6 py-4',
      className
    )}
  >
    {children}
  </div>
);

const Modal = ModalBase as ModalComponent;
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export { Modal };

export type { ModalHeaderProps, ModalBodyProps, ModalFooterProps };

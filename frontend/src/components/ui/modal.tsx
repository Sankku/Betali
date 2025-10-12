import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  className?: string;
}

interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalDescriptionProps {
  children: React.ReactNode;
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

interface ModalCloseButtonProps {
  onClose: () => void;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnOverlayClick = true,
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
    sm: 'max-w-xl',      // Era max-w-md (448px) -> ahora max-w-xl (576px) +28%
    md: 'max-w-2xl',     // Era max-w-lg (512px) -> ahora max-w-2xl (672px) +31%
    lg: 'max-w-4xl',     // Era max-w-2xl (672px) -> ahora max-w-4xl (896px) +33%
    xl: 'max-w-6xl',     // Era max-w-4xl (896px) -> ahora max-w-6xl (1152px) +28%
    full: 'max-w-7xl mx-4',
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 backdrop-blur-sm transition-all duration-300 bg-neutral-900/50 animate-fade-in"
        onClick={handleOverlayClick}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            'bg-white relative transform transition-all duration-300 w-full',
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

export const ModalContent: React.FC<ModalContentProps> = ({ children, className }) => (
  <div className={cn('relative', className)}>{children}</div>
);

export const ModalHeader: React.FC<ModalHeaderProps> = ({ children, className }) => (
  <div className={cn('px-6 py-4', className)}>{children}</div>
);

export const ModalTitle: React.FC<ModalTitleProps> = ({ children, className }) => (
  <h3 className={cn('text-lg font-semibold text-neutral-900', className)}>{children}</h3>
);

export const ModalDescription: React.FC<ModalDescriptionProps> = ({ children, className }) => (
  <p className={cn('text-sm text-neutral-600 mt-2', className)}>{children}</p>
);

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => (
  <div className={cn('px-6 py-4', className)}>{children}</div>
);

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => (
  <div className={cn('px-6 py-4 border-t border-neutral-200', className)}>{children}</div>
);

export const ModalCloseButton: React.FC<ModalCloseButtonProps> = ({ onClose, className }) => (
  <Button
    variant="ghost"
    size="icon-sm"
    onClick={onClose}
    className={cn('absolute top-4 right-4 text-neutral-500 hover:text-neutral-700 z-10', className)}
  >
    <X className="h-4 w-4" />
  </Button>
);

interface ModalComponent extends React.FC<ModalProps> {
  Content: React.FC<ModalContentProps>;
  Header: React.FC<ModalHeaderProps>;
  Title: React.FC<ModalTitleProps>;
  Description: React.FC<ModalDescriptionProps>;
  Body: React.FC<ModalBodyProps>;
  Footer: React.FC<ModalFooterProps>;
  CloseButton: React.FC<ModalCloseButtonProps>;
}

const ComposedModal = Modal as ModalComponent;
ComposedModal.Content = ModalContent;
ComposedModal.Header = ModalHeader;
ComposedModal.Title = ModalTitle;
ComposedModal.Description = ModalDescription;
ComposedModal.Body = ModalBody;
ComposedModal.Footer = ModalFooter;
ComposedModal.CloseButton = ModalCloseButton;

export default ComposedModal;

export type {
  ModalContentProps,
  ModalHeaderProps,
  ModalTitleProps,
  ModalDescriptionProps,
  ModalBodyProps,
  ModalFooterProps,
  ModalCloseButtonProps,
};

import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody } from './modal';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <Modal 
      isOpen={open} 
      onClose={() => onOpenChange(false)}
      size="lg"
    >
      {children}
    </Modal>
  );
};

export const DialogContent: React.FC<DialogContentProps> = ({ children, className }) => (
  <ModalContent className={className}>
    {children}
  </ModalContent>
);

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className }) => (
  <ModalHeader className={className}>
    {children}
  </ModalHeader>
);

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className }) => (
  <ModalTitle className={className}>
    {children}
  </ModalTitle>
);

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ children, className }) => (
  <ModalDescription className={className}>
    {children}
  </ModalDescription>
);

// Composed Dialog component
interface DialogComponent extends React.FC<DialogProps> {
  Content: React.FC<DialogContentProps>;
  Header: React.FC<DialogHeaderProps>;
  Title: React.FC<DialogTitleProps>;
  Description: React.FC<DialogDescriptionProps>;
}

const ComposedDialog = Dialog as DialogComponent;
ComposedDialog.Content = DialogContent;
ComposedDialog.Header = DialogHeader;
ComposedDialog.Title = DialogTitle;
ComposedDialog.Description = DialogDescription;

export default ComposedDialog;
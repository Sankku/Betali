export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  preventClose?: boolean;
  closeOnEsc?: boolean;
  closeOnOutsideClick?: boolean;
}

export interface ModalFooterProps {
  onClose: () => void;
  onConfirm?: () => void;
  closeText?: string;
  confirmText?: string;
  isLoading?: boolean;
  showConfirm?: boolean;
  variant?: "primary" | "danger";
}

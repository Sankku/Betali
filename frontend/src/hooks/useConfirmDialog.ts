import { useState, useCallback } from 'react';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

export const useConfirmDialog = () => {
  const [state, setState] = useState<ConfirmDialogState | null>(null);

  const showConfirm = useCallback((config: Omit<ConfirmDialogState, 'isOpen'>) => {
    setState({
      ...config,
      isOpen: true,
      confirmLabel: config.confirmLabel || 'Confirmar',
      cancelLabel: config.cancelLabel || 'Cancelar',
      variant: config.variant || 'default',
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setState(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (state) {
      await state.onConfirm();
      hideConfirm();
    }
  }, [state, hideConfirm]);

  const handleCancel = useCallback(() => {
    if (state?.onCancel) {
      state.onCancel();
    }
    hideConfirm();
  }, [state, hideConfirm]);

  return {
    confirmState: state,
    showConfirm,
    hideConfirm,
    handleConfirm,
    handleCancel,
  };
};
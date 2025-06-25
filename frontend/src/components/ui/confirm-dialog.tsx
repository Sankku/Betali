import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';
import { ConfirmDialogState } from '../../hooks/useConfirmDialog';

export interface ConfirmDialogProps {
  state: ConfirmDialogState | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  state,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!state) return null;

  const Icon = state.variant === 'destructive' ? AlertTriangle : Info;
  const iconColor = state.variant === 'destructive' ? 'text-red-600' : 'text-blue-600';
  const iconBg = state.variant === 'destructive' ? 'bg-red-100' : 'bg-blue-100';

  return (
    <Modal isOpen={state.isOpen} onClose={onCancel} size="sm">
      <Modal.Body>
        <div className="text-center">
          <div
            className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${iconBg}`}
          >
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>

          <h3 className="text-lg font-medium mb-2">{state.title}</h3>

          <p className="text-sm text-neutral-600 mb-6">{state.message}</p>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          {state.cancelLabel}
        </Button>
        <Button
          variant={state.variant === 'destructive' ? 'destructive' : 'default'}
          onClick={onConfirm}
          loading={isLoading}
        >
          {state.confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

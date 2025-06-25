import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { LucideIcon } from 'lucide-react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export interface ModalFormProps<TFormData = any> {
  isOpen: boolean;
  onClose: () => void;

  form: UseFormReturn<TFormData>;
  onSubmit: (data: TFormData) => void | Promise<void>;

  title: string;
  description?: string;
  icon?: LucideIcon;
  mode: 'create' | 'edit' | 'view';

  children: React.ReactNode;

  submitLabel?: string;
  cancelLabel?: string;
  showFooter?: boolean;
  customFooter?: React.ReactNode;

  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';

  additionalSections?: React.ReactNode;
}

export function ModalForm<TFormData = any>({
  isOpen,
  onClose,
  form,
  onSubmit,
  title,
  description,
  icon: Icon,
  mode,
  children,
  submitLabel,
  cancelLabel = 'Cancelar',
  showFooter = true,
  customFooter,
  isLoading = false,
  size = 'lg',
  additionalSections,
}: ModalFormProps<TFormData>) {
  const isViewMode = mode === 'view';

  const handleSubmit = form.handleSubmit(async data => {
    if (isViewMode) return;
    await onSubmit(data);
  });

  const getModeConfig = () => {
    switch (mode) {
      case 'view':
        return {
          badge: { variant: 'primary' as const, label: 'Solo lectura' },
          submitLabel: undefined,
        };
      case 'edit':
        return {
          badge: { variant: 'warning' as const, label: 'Editando' },
          submitLabel: submitLabel || 'Actualizar',
        };
      case 'create':
        return {
          badge: { variant: 'success' as const, label: 'Creando' },
          submitLabel: submitLabel || 'Crear',
        };
      default:
        return {
          badge: { variant: 'default' as const, label: 'Desconocido' },
          submitLabel: submitLabel || 'Guardar',
        };
    }
  };

  const modeConfig = getModeConfig();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={size}>
      <Modal.Header onClose={onClose}>
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className="p-2 rounded-lg bg-primary-50">
              <Icon className="h-5 w-5 text-primary-600" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-neutral-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
          </div>
          <Badge variant={modeConfig.badge.variant}>{modeConfig.badge.label}</Badge>
        </div>
      </Modal.Header>

      <Modal.Body>
        <form onSubmit={handleSubmit} className="space-y-6">
          {children}

          {additionalSections && (
            <div className="border-t border-neutral-200 pt-6">{additionalSections}</div>
          )}
        </form>
      </Modal.Body>

      {showFooter && (
        <Modal.Footer>
          {customFooter || (
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                {cancelLabel}
              </Button>
              {!isViewMode && modeConfig.submitLabel && (
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  loading={isLoading}
                >
                  {modeConfig.submitLabel}
                </Button>
              )}
            </>
          )}
        </Modal.Footer>
      )}
    </Modal>
  );
}

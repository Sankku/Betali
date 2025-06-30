import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { StockMovementForm } from './stock-movement-form';
import { StockMovementWithDetails, StockMovementFormData } from '../../../services/api/stockMovementService';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '../../ui';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StockMovementFormData) => void | Promise<void>;
  mode: 'create' | 'edit';
  initialData?: StockMovementWithDetails;
  isLoading?: boolean;
}

export function StockMovementModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  isLoading = false,
}: StockMovementModalProps) {
  const title = mode === 'create' ? 'Nuevo Movimiento de Stock' : 'Editar Movimiento';
  const description = mode === 'create' 
    ? 'Registra un nuevo movimiento en el inventario'
    : 'Modifica los datos del movimiento seleccionado';

  // Convert initialData to form format
  const formInitialData: Partial<StockMovementFormData> | undefined = initialData ? {
    movement_type: initialData.movement_type,
    quantity: initialData.quantity,
    product_id: initialData.product_id || undefined,
    warehouse_id: initialData.warehouse_id || undefined,
    reference: initialData.reference || undefined,
    movement_date: initialData.movement_date 
      ? new Date(initialData.movement_date).toISOString().split('T')[0]
      : undefined,
  } : undefined;

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            {title}
          </ModalTitle>
          <ModalDescription>
            {description}
          </ModalDescription>
        </ModalHeader>
        
        <div className="px-6 pb-6">
          <StockMovementForm
            onSubmit={onSubmit}
            initialData={formInitialData}
            mode={mode}
            isLoading={isLoading}
          />
        </div>
      </ModalContent>
    </Modal>
  );
}
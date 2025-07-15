import { ArrowUpDown } from 'lucide-react';
import { StockMovementForm } from './stock-movement-form';
import {
  StockMovementWithDetails,
  StockMovementFormData,
} from '../../../services/api/stockMovementService';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '../../ui';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StockMovementFormData) => void | Promise<void>;
  mode: 'create' | 'edit' | 'view';
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
  // Títulos según el modo
  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Nuevo Movimiento de Stock';
      case 'edit':
        return 'Editar Movimiento';
      case 'view':
        return 'Detalle del Movimiento';
      default:
        return 'Movimiento de Stock';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'create':
        return 'Registra un nuevo movimiento en el inventario';
      case 'edit':
        return 'Modifica los datos del movimiento seleccionado';
      case 'view':
        return 'Visualiza los detalles del movimiento';
      default:
        return '';
    }
  };

  // Convert initialData to form format
  const formInitialData: Partial<StockMovementFormData> | undefined = initialData
    ? {
        movement_type: initialData.movement_type,
        quantity: initialData.quantity,
        product_id: initialData.product_id || undefined,
        warehouse_id: initialData.warehouse_id || undefined,
        reference: initialData.reference || undefined,
        movement_date: initialData.movement_date
          ? new Date(initialData.movement_date).toISOString().split('T')[0]
          : undefined,
      }
    : undefined;

  // Debug logs
  console.log('StockMovementModal props:', { isOpen, mode, initialData });
  console.log('Modal about to render with isOpen:', isOpen);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" className="max-w-2xl">
      <ModalContent>
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            {getTitle()}
          </ModalTitle>
          <ModalDescription>{getDescription()}</ModalDescription>
        </ModalHeader>

        <div className="px-6 pb-6">
          <StockMovementForm
            onSubmit={onSubmit}
            initialData={formInitialData}
            mode={mode}
            isLoading={isLoading}
            onCancel={onClose}
          />
        </div>
      </ModalContent>
    </Modal>
  );
}

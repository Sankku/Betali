import { ArrowUpDown } from 'lucide-react';
import { useTranslation } from '../../../contexts/LanguageContext';
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
  const { t } = useTranslation();

  // Titles based on mode
  const getTitle = () => {
    switch (mode) {
      case 'create':
        return t('stockMovements.modal.createTitle');
      case 'edit':
        return t('stockMovements.modal.editTitle');
      case 'view':
        return t('stockMovements.modal.viewTitle');
      default:
        return t('stockMovements.modal.defaultTitle');
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'create':
        return t('stockMovements.modal.createDescription');
      case 'edit':
        return t('stockMovements.modal.editDescription');
      case 'view':
        return t('stockMovements.modal.viewDescription');
      default:
        return '';
    }
  };

  // Convert initialData to form format
  const raw = initialData as any;
  const formInitialData: Partial<StockMovementFormData> | undefined = initialData
    ? {
        movement_type: initialData.movement_type,
        quantity: initialData.quantity,
        // product_type_id comes from the nested lot relation returned by the API
        product_type_id: raw.lot?.product_type_id?.product_type_id || undefined,
        lot_id: initialData.lot_id || undefined,
        warehouse_id: initialData.warehouse_id || undefined,
        reference: initialData.reference || undefined,
        movement_date: initialData.movement_date
          ? new Date(initialData.movement_date).toISOString().split('T')[0]
          : undefined,
      } as any
    : undefined;

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

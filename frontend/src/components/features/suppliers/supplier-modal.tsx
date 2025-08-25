import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal';
import { SupplierForm } from './supplier-form';
import { type Supplier, type CreateSupplierData } from '@/services/api/supplierService';

export interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSupplierData) => void;
  supplier?: Supplier;
  mode?: 'create' | 'edit' | 'view';
  isLoading?: boolean;
}

export function SupplierModal({
  isOpen,
  onClose,
  onSubmit,
  supplier,
  mode = 'create',
  isLoading = false
}: SupplierModalProps) {
  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return 'Crear Nuevo Proveedor';
      case 'edit':
        return `Editar Proveedor - ${supplier?.name || ''}`;
      case 'view':
        return `Ver Proveedor - ${supplier?.name || ''}`;
      default:
        return 'Proveedor';
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return 'Complete la información para agregar un nuevo proveedor a su organización.';
      case 'edit':
        return 'Modifique la información del proveedor según sea necesario.';
      case 'view':
        return 'Información detallada del proveedor.';
      default:
        return '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{getModalTitle()}</ModalTitle>
          <ModalDescription>
            {getModalDescription()}
          </ModalDescription>
        </ModalHeader>
        
        <div className="px-6 pb-6">
          <SupplierForm
            supplier={supplier}
            onSubmit={onSubmit}
            onCancel={onClose}
            isLoading={isLoading}
            mode={mode}
          />
        </div>
      </ModalContent>
    </Modal>
  );
}

// Export types for convenience
export type { Supplier, CreateSupplierData };
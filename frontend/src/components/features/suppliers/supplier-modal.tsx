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
import { useTranslation } from '@/contexts/LanguageContext';

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
  const { t } = useTranslation();

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return t('suppliers.modal.createTitle');
      case 'edit':
        return t('suppliers.modal.editTitle', { name: supplier?.name || '' });
      case 'view':
        return t('suppliers.modal.viewTitle', { name: supplier?.name || '' });
      default:
        return t('suppliers.modal.defaultTitle');
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return t('suppliers.modal.createDescription');
      case 'edit':
        return t('suppliers.modal.editDescription');
      case 'view':
        return t('suppliers.modal.viewDescription');
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
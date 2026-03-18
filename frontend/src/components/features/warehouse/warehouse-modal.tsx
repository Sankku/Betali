import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Warehouse } from 'lucide-react';
import { ModalForm } from '../../templates/modal-form';
import { WarehouseForm, WarehouseFormData } from './warehouse-form';
import { WarehouseStats } from './warehouse-stats';
import { useTranslation } from '../../../contexts/LanguageContext';

const warehouseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
  is_active: z.boolean(),
});

export interface WarehouseWithStats {
  warehouse_id: string;
  name: string;
  location: string | null;
  is_active: boolean | null;
  created_at: string | null;
  stats?: {
    totalMovements: number;
    recentMovements: Array<{
      movement_id: string;
      movement_date: string;
      movement_type: string;
      quantity: number;
      products?: {
        name: string;
      };
    }>;
  };
}

export interface WarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  warehouse?: WarehouseWithStats;
  onSubmit: (data: WarehouseFormData) => Promise<void>;
  isLoading?: boolean;
}

export const WarehouseModal: React.FC<WarehouseModalProps> = ({
  isOpen,
  onClose,
  mode,
  warehouse,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: warehouse?.name || '',
      location: warehouse?.location || '',
      is_active: warehouse?.is_active ?? true,
    },
  });

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return t('warehouse.modal.createTitle');
      case 'edit':
        return t('warehouse.modal.editTitle', { name: warehouse?.name });
      case 'view':
        return t('warehouse.modal.viewTitle', { name: warehouse?.name });
      default:
        return t('warehouse.title');
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return t('warehouse.modal.createDescription');
      case 'edit':
        return t('warehouse.modal.editDescription', { name: warehouse?.name });
      case 'view':
        return t('warehouse.modal.viewDescription', { name: warehouse?.name });
      default:
        return '';
    }
  };

  const handleSubmit = async (data: WarehouseFormData) => {
    try {
      await onSubmit(data);
      if (mode === 'create') {
        form.reset();
      }
    } catch {
      // Error ya mostrado por el hook — no resetear el formulario
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (mode === 'create') {
        form.reset({
          name: '',
          location: '',
          is_active: true,
        });
      } else if (warehouse && (mode === 'edit' || mode === 'view')) {
        form.reset({
          name: warehouse.name || '',
          location: warehouse.location || '',
          is_active: warehouse.is_active ?? true,
        });
      }
    }
  }, [isOpen, mode, warehouse, form]);

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      form={form}
      onSubmit={handleSubmit}
      title={getModalTitle()}
      description={getModalDescription()}
      icon={Warehouse}
      mode={mode}
      isLoading={isLoading}
      size="lg"
      additionalSections={
        mode === 'view' && warehouse ? <WarehouseStats warehouse={warehouse} /> : undefined
      }
    >
      <WarehouseForm form={form} mode={mode} isLoading={isLoading} />
    </ModalForm>
  );
};

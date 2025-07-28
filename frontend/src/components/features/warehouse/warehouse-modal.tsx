import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Warehouse } from 'lucide-react';
import { ModalForm } from '../../templates/modal-form';
import { WarehouseForm, WarehouseFormData } from './warehouse-form';
import { WarehouseStats } from './warehouse-stats';

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
        return 'Create New Warehouse';
      case 'edit':
        return `Edit ${warehouse?.name}`;
      case 'view':
        return `${warehouse?.name} Details`;
      default:
        return 'Warehouse';
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return 'Complete the information to create a new warehouse in the system.';
      case 'edit':
        return `Modify the fields you want to update for "${warehouse?.name}".`;
      case 'view':
        return `Detailed information for warehouse "${warehouse?.name}" and its statistics.`;
      default:
        return '';
    }
  };

  const handleSubmit = async (data: WarehouseFormData) => {
    await onSubmit(data);
    if (mode === 'create') {
      form.reset();
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

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Warehouse } from 'lucide-react';
import { ModalForm } from '../../templates/modal-form';
import { WarehouseForm, WarehouseFormData } from './warehouse-form';
import { WarehouseStats } from './warehouse-stats';

const warehouseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  location: z.string().min(1, 'La ubicación es requerida'),
  is_active: z.boolean(),
});

export interface WarehouseWithStats {
  warehouse_id: string;
  name: string;
  location: string;
  is_active: boolean;
  created_at: string;
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
        return 'Crear Nuevo Almacén';
      case 'edit':
        return `Editar ${warehouse?.name}`;
      case 'view':
        return `Detalles de ${warehouse?.name}`;
      default:
        return 'Almacén';
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return 'Complete la información para crear un nuevo almacén en el sistema.';
      case 'edit':
        return `Modifique los campos que desee actualizar para "${warehouse?.name}".`;
      case 'view':
        return `Información detallada del almacén "${warehouse?.name}" y sus estadísticas.`;
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

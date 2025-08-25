import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building } from 'lucide-react';
import { z } from 'zod';
import { ModalForm } from '../../templates/modal-form';
import { ClientForm } from './client-form';
import { Client, CreateClientData } from '../../../hooks/useClients';
import { clientService } from '../../../services/api/clientService';

const clientSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(200, 'El nombre no puede exceder 200 caracteres'),
  cuit: z
    .string()
    .min(11, 'El CUIT debe tener 11 dígitos')
    .max(13, 'Formato de CUIT inválido')
    .refine((cuit) => {
      const cleaned = cuit.replace(/\D/g, '');
      return cleaned.length === 11;
    }, 'El CUIT debe tener exactamente 11 dígitos')
    .refine((cuit) => {
      const cleaned = cuit.replace(/\D/g, '');
      if (cleaned.length !== 11) return false;
      
      // Basic CUIT validation algorithm
      const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cleaned[i]) * multipliers[i];
      }
      
      const remainder = sum % 11;
      let verifierDigit;
      
      if (remainder < 2) {
        verifierDigit = remainder;
      } else {
        verifierDigit = 11 - remainder;
      }
      
      return parseInt(cleaned[10]) === verifierDigit;
    }, 'El CUIT ingresado no es válido'),
  email: z
    .string()
    .email('Ingrese una dirección de email válida')
    .max(100, 'El email no puede exceder 100 caracteres'),
  phone: z
    .string()
    .max(50, 'El teléfono no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(500, 'La dirección no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

export type ClientFormData = z.infer<typeof clientSchema>;

export interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientData) => void | Promise<void>;
  mode: 'create' | 'edit' | 'view';
  client?: Client;
  isLoading?: boolean;
}

export function ClientModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  client,
  isLoading = false,
}: ClientModalProps) {
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || '',
      cuit: client?.cuit || '',
      email: client?.email || '',
      phone: client?.phone || '',
      address: client?.address || '',
    },
  });

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return 'Crear Nuevo Cliente';
      case 'edit':
        return `Editar ${client?.name}`;
      case 'view':
        return `Detalles de ${client?.name}`;
      default:
        return 'Cliente';
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return 'Agregar un nuevo cliente al sistema. Los datos fiscales son necesarios para la facturación.';
      case 'edit':
        return `Modificar la información del cliente "${client?.name}". Verifique que los datos fiscales sean correctos.`;
      case 'view':
        return `Información completa del cliente "${client?.name}". Los datos se utilizan para facturación y reportes.`;
      default:
        return '';
    }
  };

  const handleSubmit = async (data: ClientFormData) => {
    // Clean and normalize CUIT
    const cleanedCuit = data.cuit.replace(/\D/g, '');
    const normalizedData = {
      ...data,
      cuit: cleanedCuit,
      phone: data.phone || null,
      address: data.address || null,
    };

    await onSubmit(normalizedData as CreateClientData);
    
    if (mode === 'create') {
      form.reset();
    }
  };

  useEffect(() => {
    if (isOpen && client && (mode === 'edit' || mode === 'view')) {
      // Format CUIT for display
      const formattedCuit = clientService.formatCuit(client.cuit);
      
      form.reset({
        name: client.name,
        cuit: formattedCuit,
        email: client.email,
        phone: client.phone || '',
        address: client.address || '',
      });
    } else if (isOpen && mode === 'create') {
      form.reset({
        name: '',
        cuit: '',
        email: '',
        phone: '',
        address: '',
      });
    }
  }, [isOpen, client, mode, form]);

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      form={form}
      onSubmit={handleSubmit}
      title={getModalTitle()}
      description={getModalDescription()}
      icon={Building}
      mode={mode}
      isLoading={isLoading}
      size="lg"
      submitLabel={mode === 'create' ? 'Crear Cliente' : 'Actualizar Cliente'}
    >
      <ClientForm form={form} mode={mode} isLoading={isLoading} />
    </ModalForm>
  );
}
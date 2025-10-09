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
    .max(200, 'El nombre no puede exceder 200 caracteres')
    .refine((name) => {
      // Should not be only whitespace
      return name.trim().length >= 2;
    }, 'El nombre no puede estar vacío o contener solo espacios')
    .refine((name) => {
      // Should not contain only numbers or special characters
      const hasLetter = /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(name);
      return hasLetter;
    }, 'El nombre debe contener al menos una letra'),
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
    .max(100, 'El email no puede exceder 100 caracteres')
    .refine((email) => {
      // Additional email validation for business context
      const domain = email.split('@')[1];
      if (!domain) return false;
      // Should have a valid domain with at least one dot
      return domain.includes('.') && domain.length >= 4;
    }, 'El email debe tener un dominio válido')
    .refine((email) => {
      // Check for common typos in domains
      const commonDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'];
      const typos = ['gmail.co', 'hotmail.co', 'yahoo.co', 'gmial.com', 'gmai.com'];
      const domain = email.split('@')[1]?.toLowerCase();
      if (typos.includes(domain)) {
        return false;
      }
      return true;
    }, 'Verifique el dominio del email (posible error tipográfico)'),
  phone: z
    .string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .refine((phone) => {
      if (!phone || phone === '') return true; // Optional field
      // Remove all non-digit characters for validation
      const cleaned = phone.replace(/\D/g, '');
      // Should have between 8-15 digits (international standard)
      return cleaned.length >= 8 && cleaned.length <= 15;
    }, 'El teléfono debe tener entre 8 y 15 dígitos')
    .refine((phone) => {
      if (!phone || phone === '') return true; // Optional field
      // Allow formats like: +54 9 11 1234-5678, (011) 1234-5678, 011-1234-5678, etc.
      const phoneRegex = /^[\+]?[0-9\s\-\(\)\.]{8,20}$/;
      return phoneRegex.test(phone);
    }, 'Formato de teléfono inválido. Use números, espacios, guiones o paréntesis')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(500, 'La dirección no puede exceder 500 caracteres')
    .refine((address) => {
      if (!address || address === '') return true; // Optional field
      // Should not be only whitespace
      return address.trim().length >= 5;
    }, 'La dirección debe tener al menos 5 caracteres')
    .refine((address) => {
      if (!address || address === '') return true; // Optional field
      // Should contain some letters (not only numbers and symbols)
      const hasLetter = /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(address);
      return hasLetter;
    }, 'La dirección debe contener al menos una letra')
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
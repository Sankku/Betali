import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Users } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from '@/contexts/LanguageContext';
import { ModalForm } from '../../templates/modal-form';
import { UserForm } from './user-form';
import { User, CreateUserData } from '../../../hooks/useUsers';

const userSchema = z
  .object({
    name: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede superar los 100 caracteres'),
    email: z
      .string()
      .email('Ingresa un correo electrónico válido')
      .max(100, 'El correo no puede superar los 100 caracteres'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'La contraseña debe contener al menos una minúscula, una mayúscula y un número'
      )
      .optional()
      .or(z.literal('')),
    confirmPassword: z.string().optional().or(z.literal('')),
    role: z.string().min(1, 'El rol es requerido'),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    { message: 'Las contraseñas no coinciden', path: ['confirmPassword'] }
  );

export type UserFormData = z.infer<typeof userSchema>;

export interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserData) => void | Promise<void>;
  mode: 'create' | 'edit' | 'view';
  user?: User;
  isLoading?: boolean;
}

export function UserModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  user,
  isLoading = false,
}: UserModalProps) {
  const { t } = useTranslation();
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      confirmPassword: '',
      role: user?.role || 'employee',
      is_active: user?.is_active ?? true,
    },
  });

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return t('users.modal.createTitle');
      case 'edit':
        return t('users.modal.editTitle', { name: user?.name || '' });
      case 'view':
        return t('users.modal.viewTitle', { name: user?.name || '' });
      default:
        return t('users.modal.defaultTitle');
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return t('users.modal.createDescription');
      case 'edit':
        return t('users.modal.editDescription', { name: user?.name || '' });
      case 'view':
        return t('users.modal.viewDescription', { name: user?.name || '' });
      default:
        return '';
    }
  };

  const handleSubmit = async (data: UserFormData) => {
    try {
      // Always strip confirmPassword before sending
      const { confirmPassword: _confirmPassword, ...cleanData } = data;
      // If editing and password is empty, don't include it
      if (mode === 'edit' && !cleanData.password) {
        const { password: _password, ...dataWithoutPassword } = cleanData;
        await onSubmit(dataWithoutPassword as CreateUserData);
      } else {
        await onSubmit(cleanData as CreateUserData);
      }
      if (mode === 'create') {
        form.reset();
      }
    } catch {
      // Error ya mostrado por el hook — no resetear el formulario
    }
  };

  useEffect(() => {
    if (isOpen && user && mode !== 'create') {
      form.reset({
        name: user.name || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        is_active: user.is_active ?? true,
      });
    } else if (isOpen && mode === 'create') {
      form.reset({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        is_active: true,
      });
    }
  }, [isOpen, user, mode, form]);

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      form={form}
      onSubmit={handleSubmit}
      title={getModalTitle()}
      description={getModalDescription()}
      icon={Users}
      mode={mode}
      isLoading={isLoading}
      size="lg"
    >
      <UserForm form={form} mode={mode} isLoading={isLoading} />
    </ModalForm>
  );
}

// Re-export types for convenience
export type { User, UserFormData };
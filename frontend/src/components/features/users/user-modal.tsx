import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Users } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from '@/contexts/LanguageContext';
import { ModalForm } from '../../templates/modal-form';
import { UserForm } from './user-form';
import { User, CreateUserData } from '../../../hooks/useUsers';

const userSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(100, 'Email cannot exceed 100 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    )
    .optional()
    .or(z.literal('')),
  role: z
    .string()
    .min(1, 'Role is required'),
  is_active: z.boolean().default(true),
});

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
    // If editing and password is empty, don't include it
    if (mode === 'edit' && !data.password) {
      const { password, ...dataWithoutPassword } = data;
      await onSubmit(dataWithoutPassword as CreateUserData);
    } else {
      await onSubmit(data as CreateUserData);
    }
    
    if (mode === 'create') {
      form.reset();
    }
  };

  useEffect(() => {
    if (isOpen && user && mode !== 'create') {
      form.reset({
        name: user.name || '',
        email: user.email || '',
        password: '',
        is_active: user.is_active ?? true,
      });
    } else if (isOpen && mode === 'create') {
      form.reset({
        name: '',
        email: '',
        password: '',
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
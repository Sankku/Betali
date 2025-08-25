import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Users, Mail, Shield } from 'lucide-react';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { UserFormData } from './user-modal';
import { RoleSelector } from './role-selector';
import { useUserContext } from '@/hooks/useUsers';
import { UserRole } from '@/utils/roleUtils';

export interface UserFormProps {
  form: UseFormReturn<UserFormData>;
  mode: 'create' | 'edit' | 'view';
  isLoading?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({ form, mode, isLoading = false }) => {
  const isViewMode = mode === 'view';
  const isEditing = mode === 'edit';
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  // Get current user context to determine role restrictions
  const { data: userContext } = useUserContext();
  // Normalize role from backend (SUPER_ADMIN) to frontend format (super_admin)
  const rawRole = userContext?.permissions?.role;
  const currentUserRole = rawRole ? rawRole.toLowerCase() as UserRole : undefined;
  

  const currentName = watch('name') || '';
  const currentEmail = watch('email') || '';
  const currentRole = watch('role') || '';
  const currentIsActive = watch('is_active') ?? true;

  const ViewField: React.FC<{
    label: string;
    value: string;
    icon: React.ReactNode;
    description?: string;
  }> = ({ label, value, icon, description }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700 flex items-center gap-2">
        {icon}
        {label}
      </label>
      {description && <p className="text-xs text-neutral-500">{description}</p>}
      <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm">
        <span className="text-neutral-800">{value || 'Not specified'}</span>
      </div>
    </div>
  );

  if (isViewMode) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ViewField
            label="Full Name"
            value={currentName}
            icon={<Users className="w-4 h-4" />}
          />
          <ViewField
            label="Email Address"
            value={currentEmail}
            icon={<Mail className="w-4 h-4" />}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ViewField
            label="Role"
            value={currentRole || 'Not assigned'}
            icon={<Shield className="w-4 h-4" />}
          />
          <ViewField
            label="Status"
            value={currentIsActive ? 'Active' : 'Inactive'}
            icon={<Shield className="w-4 h-4" />}
          />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Organization roles, permissions, and assignments are managed separately in the team management section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-neutral-700 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Full Name
          </label>
          <Input
            id="name"
            placeholder="Enter full name"
            {...register('name')}
            disabled={isLoading}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-neutral-700 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="Enter email address"
            {...register('email')}
            disabled={isLoading}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Global Role
        </label>
        <RoleSelector
          value={currentRole}
          onValueChange={(value) => setValue('role', value)}
          disabled={isLoading}
          placeholder="Select a role..."
          excludeRoles={[]}
          showDescription={true}
          currentUserRole={currentUserRole}
          showRestrictions={true}
        />
        {errors.role && (
          <p className="text-xs text-red-500">{errors.role.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Password {isEditing && '(leave empty to keep current password)'}
        </label>
        <Input
          id="password"
          type="password"
          placeholder={isEditing ? 'Enter new password (optional)' : 'Enter password'}
          {...register('password')}
          disabled={isLoading}
          className={errors.password ? 'border-red-500' : ''}
        />
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 mb-1">Organization Roles & Permissions</h4>
            <p className="text-sm text-amber-700">
              User roles and permissions are now managed per organization. After creating this user, 
              invite them to organizations through the team management section to assign specific roles and permissions.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <label className="text-base font-medium text-neutral-700 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Active User
          </label>
          <p className="text-sm text-neutral-500">
            Active users can access the system and perform their assigned tasks
          </p>
        </div>
        <Switch
          checked={currentIsActive}
          onCheckedChange={(checked) => form.setValue('is_active', checked)}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Users, Mail, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { Button } from '../../ui/button';
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
  const { t } = useTranslation();
  const isViewMode = mode === 'view';
  const isEditing = mode === 'edit';
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        <span className="text-neutral-800">{value || t('users.form.notSpecified')}</span>
      </div>
    </div>
  );

  if (isViewMode) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ViewField
            label={t('users.form.fullName')}
            value={currentName}
            icon={<Users className="w-4 h-4" />}
          />
          <ViewField
            label={t('users.form.emailAddress')}
            value={currentEmail}
            icon={<Mail className="w-4 h-4" />}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ViewField
            label={t('users.form.globalRole')}
            value={currentRole || t('users.form.notAssigned')}
            icon={<Shield className="w-4 h-4" />}
          />
          <ViewField
            label={t('users.fields.status')}
            value={currentIsActive ? t('users.form.statusActive') : t('users.form.statusInactive')}
            icon={<Shield className="w-4 h-4" />}
          />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            {t('users.form.orgRolesNote')}
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
            {t('users.form.fullName')}
            <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            placeholder={t('users.form.fullNamePlaceholder')}
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
            {t('users.form.emailAddress')}
            <span className="text-red-500">*</span>
          </label>
          <Input
            id="email"
            type="email"
            placeholder={t('users.form.emailPlaceholder')}
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
          {t('users.form.globalRole')}
        </label>
        <RoleSelector
          value={currentRole}
          onValueChange={(value) => setValue('role', value)}
          disabled={isLoading}
          placeholder={t('users.form.rolePlaceholder')}
          excludeRoles={[]}
          showDescription={true}
          currentUserRole={currentUserRole}
          showRestrictions={true}
        />
        {errors.role && (
          <p className="text-xs text-red-500">{errors.role.message}</p>
        )}
      </div>

      {/* Password field with show/hide toggle */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          {isEditing ? t('users.form.passwordOptional') : t('users.form.password')}
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder={isEditing ? t('users.form.passwordEditPlaceholder') : t('users.form.passwordPlaceholder')}
            {...register('password')}
            disabled={isLoading}
            className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-neutral-400 hover:text-neutral-600"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isLoading}
            tabIndex={-1}
            aria-label={showPassword ? t('users.form.hidePassword') : t('users.form.showPassword')}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm password field — only shown when a password is being set */}
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          {t('users.form.confirmPassword')}
        </label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder={isEditing ? t('users.form.confirmPasswordEditPlaceholder') : t('users.form.confirmPasswordPlaceholder')}
            {...register('confirmPassword', {
              onBlur: () => form.trigger('confirmPassword'),
            })}
            disabled={isLoading}
            className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-neutral-400 hover:text-neutral-600"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            disabled={isLoading}
            tabIndex={-1}
            aria-label={showConfirmPassword ? t('users.form.hidePassword') : t('users.form.showPassword')}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 mb-1">{t('users.form.orgRolesTitle')}</h4>
            <p className="text-sm text-amber-700">
              {t('users.form.orgRolesDesc')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <label className="text-base font-medium text-neutral-700 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {t('users.form.activeUser')}
          </label>
          <p className="text-sm text-neutral-500">
            {t('users.form.activeUserDesc')}
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

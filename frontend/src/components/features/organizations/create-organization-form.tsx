import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2 } from 'lucide-react';
import { useOrganization } from '../../../context/OrganizationContext';
import { ModalForm } from '../../templates/modal-form';

const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255, 'Name too long'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
});

type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;

interface CreateOrganizationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateOrganizationForm({ isOpen, onClose, onSuccess }: CreateOrganizationFormProps) {
  const { createOrganization, loading } = useOrganization();
  
  const form = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      slug: ''
    }
  });

  const { register, formState: { errors }, watch, setValue } = form;
  const watchName = watch('name');

  // Generate a steady random suffix for the lifetime of this form instance
  const [randomSuffix] = React.useState(() => Math.floor(1000 + Math.random() * 9000).toString());

  // Auto-generate slug from name
  React.useEffect(() => {
    if (watchName && !form.formState.dirtyFields.slug) {
      const baseSlug = watchName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim();
      
      const autoSlug = baseSlug ? `${baseSlug}-${randomSuffix}` : '';
      
      setValue('slug', autoSlug, { shouldValidate: true });
    }
  }, [watchName, setValue, randomSuffix, form.formState.dirtyFields.slug]);

  const onSubmit = async (data: CreateOrganizationFormData) => {
    try {
      await createOrganization(data);
      onSuccess?.();
      onClose();
      form.reset();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      
      // Handle duplicate slug error specifically
      if (error?.code === 'DUPLICATE_SLUG' || error?.message?.includes('slug already exists')) {
        form.setError('slug', {
          type: 'manual',
          message: error?.message || 'This organization URL slug is already taken. Please choose a different one.'
        });
      } else if (error?.field === 'name') {
        form.setError('name', {
          type: 'manual',
          message: error.message || 'Invalid organization name'
        });
      } else {
        // Generic error handling
        form.setError('name', {
          type: 'manual',
          message: error?.message || 'Failed to create organization. Please try again.'
        });
      }
    }
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      form={form}
      onSubmit={onSubmit}
      title="Create Organization"
      description="Set up your organization to start managing your business inventory and team members."
      icon={Building2}
      mode="create"
      isLoading={loading}
      size="md"
      submitLabel="Create Organization"
    >
      <div className="space-y-4">
        {/* Organization Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Organization Name *
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            placeholder="Enter organization name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 placeholder-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Organization Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
            URL Slug *
          </label>
          <input
            {...register('slug')}
            type="text"
            id="slug"
            placeholder="organization-slug"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 placeholder-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500"
          />
          {errors.slug && (
            <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            URL-friendly identifier (auto-generated from name)
          </p>
        </div>
      </div>
    </ModalForm>
  );
}
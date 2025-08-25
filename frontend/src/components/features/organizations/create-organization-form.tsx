import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Loader2 } from 'lucide-react';
import { useOrganization } from '../../../context/OrganizationContext';

const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255, 'Name too long'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
});

type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;

interface CreateOrganizationFormProps {
  onSuccess?: () => void;
}

export function CreateOrganizationForm({ onSuccess }: CreateOrganizationFormProps) {
  const { createOrganization } = useOrganization();
  const [isCreating, setIsCreating] = useState(false);
  
  const form = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      slug: ''
    }
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;
  const watchName = watch('name');

  // Auto-generate slug from name
  React.useEffect(() => {
    if (watchName) {
      const autoSlug = watchName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim();
      setValue('slug', autoSlug);
    }
  }, [watchName, setValue]);

  const onSubmit = async (data: CreateOrganizationFormData) => {
    setIsCreating(true);
    try {
      await createOrganization(data);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating organization:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-50">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Create Organization</h3>
          <p className="text-sm text-gray-500">Set up your first organization</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Organization Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Organization Name
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            placeholder="Enter organization name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Organization Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
            URL Slug
          </label>
          <input
            {...register('slug')}
            type="text"
            id="slug"
            placeholder="organization-slug"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          {errors.slug && (
            <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Used in URLs and must be unique
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isCreating}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Organization'
          )}
        </button>
      </form>
    </div>
  );
}
import { Form, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';
import { RoleSelector } from './role-selector';
import { OrganizationSelector } from './organization-selector';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '../../ui/form';

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
  role: z.enum(['super_admin', 'admin', 'manager', 'employee', 'viewer'], {
    required_error: 'Please select a role',
  }),
  organization_id: z.string().uuid().optional().nullable(),
  branch_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  onSubmit: (data: UserFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<UserFormData>;
  isEditing?: boolean;
}

export function UserForm({
  onSubmit,
  isLoading = false,
  initialData,
  isEditing = false,
}: UserFormProps) {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      role: initialData?.role || 'employee',
      organization_id: initialData?.organization_id || null,
      branch_id: initialData?.branch_id || null,
      is_active: initialData?.is_active ?? true,
    },
  });

  const handleSubmit = (data: UserFormData) => {
    // If editing and password is empty, don't include it
    if (isEditing && !data.password) {
      const { password, ...dataWithoutPassword } = data;
      onSubmit(dataWithoutPassword);
    } else {
      onSubmit(data);
    }
  };

  const selectedRole = form.watch('role');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter full name" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Password {isEditing && '(leave empty to keep current password)'}
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder={isEditing ? 'Enter new password (optional)' : 'Enter password'}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <RoleSelector
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                  excludeRoles={selectedRole === 'super_admin' ? [] : ['super_admin']}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedRole !== 'super_admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="organization_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization</FormLabel>
                  <FormControl>
                    <OrganizationSelector
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                      placeholder="Select organization..."
                    />
                  </FormControl>
                  <FormDescription>Required for non-super admin users</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch ID (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter branch UUID"
                      {...field}
                      value={field.value || ''}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>Leave empty if not using branches</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active User</FormLabel>
                <FormDescription>
                  Active users can access the system and perform their assigned tasks
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4 pt-6">
          <Button type="submit" disabled={isLoading} className="min-w-[120px]">
            {isLoading ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

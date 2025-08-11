import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserForm } from './user-form';

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager' | 'employee' | 'viewer';
  organization_id?: string | null;
  branch_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  user?: User | null;
  mode: 'create' | 'edit';
}

export function UserModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  user,
  mode,
}: UserModalProps) {
  const isEditing = mode === 'edit';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update user information and permissions. Leave password empty to keep current password.'
              : 'Add a new user to the system with appropriate role and permissions.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <UserForm
            onSubmit={onSubmit}
            isLoading={isLoading}
            initialData={user ? {
              name: user.name,
              email: user.email,
              role: user.role,
              organization_id: user.organization_id,
              branch_id: user.branch_id,
              is_active: user.is_active,
            } : undefined}
            isEditing={isEditing}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
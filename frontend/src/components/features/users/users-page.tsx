import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CRUDPage } from '@/components/templates/crud-page';
import { BackendConfiguredTable } from '@/components/table/BackendConfiguredTable';
import { UserModal, User } from './user-modal';
import { apiService } from '@/services/api';
import { tableConfigService } from '@/services/api/tableConfigService';
import { toast } from 'sonner';

export function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch users
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiService.users.getAll(),
  });

  // Fetch table configuration
  const {
    data: tableConfig,
    isLoading: isConfigLoading,
    error: configError,
  } = useQuery({
    queryKey: ['table-config', 'users'],
    queryFn: () => tableConfigService.getTableConfig('users'),
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiService.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setSelectedUser(null);
      toast.success('User created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create user');
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiService.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setSelectedUser(null);
      toast.success('User updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user');
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate user');
    },
  });

  const handleCreateClick = () => {
    setSelectedUser(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    if (window.confirm(`Are you sure you want to deactivate ${user.email}?`)) {
      deleteMutation.mutate(user.user_id);
    }
  };

  const handleTableAction = (action: string, user: User) => {
    switch (action) {
      case 'view':
        // Implement view logic
        console.log('View user:', user);
        break;
      case 'edit':
        handleEditClick(user);
        break;
      case 'toggle-status':
        // Implement toggle status logic
        console.log('Toggle status for user:', user);
        break;
      case 'delete':
        handleDeleteClick(user);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleModalSubmit = (data: any) => {
    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.user_id, data });
    }
  };

  const isLoading_combined = isLoading || isConfigLoading;

  const isAnyMutationLoading = 
    createMutation.isPending || 
    updateMutation.isPending || 
    deleteMutation.isPending;


  if (configError) {
    return (
      <CRUDPage
        title="Users"
        description="Manage system users, roles, and permissions"
        data={[]}
        isLoading={false}
        error={configError}
        onCreateClick={handleCreateClick}
        isAnyMutationLoading={isAnyMutationLoading}
      />
    );
  }

  return (
    <>
      <CRUDPage
        title="Users"
        description="Manage system users, roles, and permissions"
        data={users}
        isLoading={isLoading_combined}
        error={error}
        onCreateClick={handleCreateClick}
        isAnyMutationLoading={isAnyMutationLoading}
        customTable={
          tableConfig ? (
            <BackendConfiguredTable
              config={tableConfig}
              data={users}
              onAction={handleTableAction}
              isLoading={isLoading_combined}
            />
          ) : null
        }
      />

      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleModalSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        user={selectedUser}
        mode={modalMode}
      />
    </>
  );
}
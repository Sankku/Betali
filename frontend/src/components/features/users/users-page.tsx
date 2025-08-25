import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle } from 'lucide-react';
import { CRUDPage } from '@/components/templates/crud-page';
import { BackendConfiguredTable } from '@/components/table/BackendConfiguredTable';
import { useTableConfig } from '@/hooks/useTableConfig';
import { Button } from '@/components/ui/button';
import { ToastContainer } from '@/components/ui/toast';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui';
import { UserModal, User } from './user-modal';
import {
  useUserManagement,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useToggleUserStatus,
  CreateUserData,
} from '@/hooks/useUsers';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  user?: User;
}

interface DeleteConfirmState {
  show: boolean;
  user?: User;
}

export function UsersPage() {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
  });

  // Use the new hooks and table configuration system
  const {
    data: tableConfig,
    isLoading: configLoading,
    error: configError,
  } = useTableConfig('users');
  
  const { data: users = [], isLoading, error } = useUserManagement();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const toggleUserStatus = useToggleUserStatus();

  const openModal = (mode: ModalState['mode'], user?: User) => {
    setModal({ isOpen: true, mode, user });
  };

  const closeModal = () => {
    setModal({ isOpen: false, mode: 'create', user: undefined });
  };

  const handleCreateClick = () => openModal('create');

  const handleDelete = async (user: User) => {
    if (!user?.user_id) {
      console.error('User ID is missing:', user);
      return;
    }
    setShowDeleteConfirm({ show: true, user });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.user?.user_id) {
      try {
        await deleteUser.mutateAsync(showDeleteConfirm.user.user_id);
        setShowDeleteConfirm({ show: false });
      } catch (error) {
        console.error('Error deleting:', error);
      }
    } else {
      console.error('Cannot delete: User ID is missing');
    }
  };

  const closeDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm({ show: false });
  }, []);

  const handleToggleStatus = async (user: User) => {
    if (!user?.user_id) {
      console.error('User ID is missing:', user);
      return;
    }
    try {
      await toggleUserStatus.mutateAsync({ 
        id: user.user_id, 
        is_active: !user.is_active 
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleSubmit = async (data: CreateUserData) => {
    try {
      if (modal.mode === 'create') {
        await createUser.mutateAsync(data);
      } else if (modal.mode === 'edit' && modal.user?.user_id) {
        await updateUser.mutateAsync({
          id: modal.user.user_id,
          data: data,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  // Handle table actions from the configurable table
  const handleTableAction = useCallback((action: string, row: User) => {
    switch (action) {
      case 'view':
        openModal('view', row);
        break;
      case 'edit':
        openModal('edit', row);
        break;
      case 'delete':
        handleDelete(row);
        break;
      case 'toggle-status':
        handleToggleStatus(row);
        break;
      case 'create':
        openModal('create');
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }, []);

  const isLoaderVisible =
    createUser.isPending || updateUser.isPending || deleteUser.isPending || toggleUserStatus.isPending;

  return (
    <>
      <Helmet>
        <title>Users - Dashboard</title>
      </Helmet>

      <CRUDPage
        title={(tableConfig as any)?.name || 'User Management'}
        description={
          configLoading
            ? 'Loading table configuration...'
            : 'Manage system users, roles, and permissions'
        }
        data={users}
        isLoading={isLoading || isLoaderVisible || configLoading}
        error={error || configError}
        onCreateClick={handleCreateClick}
        customTable={
          tableConfig ? (
            <BackendConfiguredTable
              config={tableConfig as any}
              data={users}
              onAction={handleTableAction}
              isLoading={isLoading || isLoaderVisible}
            />
          ) : null
        }
      />

      <UserModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        mode={modal.mode}
        user={modal.user}
        onSubmit={handleSubmit}
        isLoading={createUser.isPending || updateUser.isPending}
      />

      <Modal isOpen={showDeleteConfirm.show} onClose={closeDeleteConfirm} size="sm">
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>Delete user permanently?</ModalTitle>
            <ModalDescription>
              This action will permanently delete the user{' '}
              <span className="font-medium text-neutral-900">
                "{showDeleteConfirm.user?.name || 'selected'}"
              </span>
              . This action cannot be undone and all data will be lost.
            </ModalDescription>
          </ModalHeader>

          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteConfirm}
              disabled={deleteUser.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteUser.isPending}
              className="w-full sm:w-auto"
            >
              Delete Permanently
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
    </>
  );
}
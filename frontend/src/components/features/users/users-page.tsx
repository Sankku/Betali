import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, User as UserIcon, Mail, Shield, Eye, Edit, Trash, ToggleLeft, ToggleRight } from 'lucide-react';
import { CRUDPage } from '@/components/templates/crud-page';
import { TableWithBulkActions, BulkAction } from '@/components/ui/table-with-bulk-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  useUserContext,
  CreateUserData,
} from '@/hooks/useUsers';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  user?: User;
}

interface DeleteConfirmState {
  show: boolean;
  users: User[];
}

export function UsersPage() {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    users: [],
  });

  const { data: users = [], isLoading, error } = useUserManagement();
  const { data: userContext } = useUserContext();
  const currentUserId = userContext?.user?.id;
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

  const handleDelete = async (users: User[]) => {
    if (!users || users.length === 0) {
      console.error('No users selected');
      return;
    }
    setShowDeleteConfirm({ show: true, users });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.users.length > 0) {
      try {
        for (const user of showDeleteConfirm.users) {
          if (user.user_id) {
            await deleteUser.mutateAsync(user.user_id);
          }
        }
        setShowDeleteConfirm({ show: false, users: [] });
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const closeDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm({ show: false, users: [] });
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

  const isLoaderVisible =
    createUser.isPending || updateUser.isPending || deleteUser.isPending || toggleUserStatus.isPending;

  // Bulk actions configuration
  const bulkActions: BulkAction<User>[] = useMemo(() => [{
    key: 'delete',
    label: 'Delete',
    icon: Trash,
    colorScheme: {
      bg: 'bg-white',
      border: 'border-red-300',
      text: 'text-red-700',
      hoverBg: 'hover:bg-red-50'
    },
    onClick: (users) => handleDelete(users.filter(u => u.user_id !== currentUserId)),
    alwaysShow: true,
  }], [currentUserId]);

  // Columns configuration
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }: any) => {
        const isSelf = row.original.user_id === currentUserId;
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{row.original.name}</span>
                {isSelf && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 font-medium">Tú</span>
                )}
              </div>
              <div className="text-sm text-gray-500">{row.original.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }: any) => (
        <div className="flex items-center">
          <Shield className="w-4 h-4 text-gray-400 mr-2" />
          <Badge variant="outline" className="capitalize">
            {row.original.role || 'user'}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge
          variant={row.original.is_active ? "default" : "secondary"}
          className={row.original.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
        >
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const isSelf = row.original.user_id === currentUserId;
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openModal('view', row.original)}
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openModal('edit', row.original)}
              className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <span title={isSelf ? 'No puedes desactivar tu propia cuenta' : undefined}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleStatus(row.original)}
                disabled={isSelf}
                title={row.original.is_active ? 'Deactivate user' : 'Activate user'}
                className={row.original.is_active
                  ? "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                  : "text-red-400 hover:text-red-600 hover:bg-red-50"}
              >
                {row.original.is_active
                  ? <ToggleRight className="w-5 h-5" />
                  : <ToggleLeft className="w-5 h-5" />}
              </Button>
            </span>
            <span title={isSelf ? 'No puedes eliminar tu propia cuenta' : undefined}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete([row.original])}
                disabled={isSelf}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash className="w-4 h-4" />
              </Button>
            </span>
          </div>
        );
      },
    },
  ], [currentUserId]);

  return (
    <>
      <Helmet>
        <title>Users - Dashboard</title>
      </Helmet>

      <CRUDPage
        title="User Management"
        description="Manage system users, roles, and permissions"
        data={users}
        isLoading={isLoading || isLoaderVisible}
        error={error}
        onCreateClick={handleCreateClick}
        customTable={
          <TableWithBulkActions
            data={users}
            columns={columns}
            loading={isLoading}
            getRowId={(user: User) => user.user_id}
            bulkActions={bulkActions}
            createButtonLabel="New User"
            onCreateClick={handleCreateClick}
            onRowDoubleClick={(user) => openModal('edit', user)}
            searchable={true}
            enablePagination={true}
            pageSize={10}
            emptyMessage="No users found. Create your first user to get started!"
          />
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
              {showDeleteConfirm.users.length === 1 ? (
                <>
                  This action will permanently delete the user{' '}
                  <span className="font-medium text-neutral-900">
                    "{showDeleteConfirm.users[0]?.name || 'selected'}"
                  </span>
                  .
                </>
              ) : (
                <>
                  This action will permanently delete <strong>{showDeleteConfirm.users.length}</strong> users.
                </>
              )}
              {' '}This action cannot be undone and all data will be lost.
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
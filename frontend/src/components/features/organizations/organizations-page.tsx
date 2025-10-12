import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Building2, Eye, Edit, Trash, Users, Calendar } from 'lucide-react';
import { CRUDPage } from '@/components/templates/crud-page';
import { TableWithBulkActions, BulkAction } from '@/components/ui/table-with-bulk-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import { Organization } from '@/types/organization';
import { OrganizationModal } from './organization-modal';
import {
  useOrganizationManagement,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
} from '@/hooks/useOrganizations';
import { useOrganization } from '@/context/OrganizationContext';


interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  organization?: Organization;
}

interface DeleteConfirmState {
  show: boolean;
  organizations: Organization[];
}

export function OrganizationsPage() {
  const { currentOrganization } = useOrganization();
  
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    organizations: [],
  });

  const { data: userOrganizations = [], isLoading, error } = useOrganizationManagement();
  
  // Transform user organizations to extract just the organization data for the table
  const organizations = userOrganizations.map(userOrg => userOrg.organization);
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();

  const openModal = (mode: ModalState['mode'], organization?: Organization) => {
    setModal({ isOpen: true, mode, organization });
  };

  const closeModal = () => {
    setModal({ isOpen: false, mode: 'create', organization: undefined });
  };

  const handleCreateClick = () => openModal('create');

  const handleDelete = async (organizations: Organization[]) => {
    if (!organizations || organizations.length === 0) {
      console.error('No organizations selected');
      return;
    }
    setShowDeleteConfirm({ show: true, organizations });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.organizations.length > 0) {
      try {
        for (const org of showDeleteConfirm.organizations) {
          if (org.organization_id) {
            await deleteOrganization.mutateAsync(org.organization_id);
          }
        }
        setShowDeleteConfirm({ show: false, organizations: [] });
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const closeDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm({ show: false, organizations: [] });
  }, []);

  const handleSubmit = async (data: any) => {
    try {
      if (modal.mode === 'create') {
        await createOrganization.mutateAsync(data);
      } else if (modal.mode === 'edit' && modal.organization?.organization_id) {
        await updateOrganization.mutateAsync({
          id: modal.organization.organization_id,
          data: data,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const isLoaderVisible =
    createOrganization.isPending || updateOrganization.isPending || deleteOrganization.isPending;

  // Bulk actions configuration
  const bulkActions: BulkAction<Organization>[] = useMemo(() => [{
    key: 'delete',
    label: 'Delete',
    icon: Trash,
    colorScheme: {
      bg: 'bg-white',
      border: 'border-red-300',
      text: 'text-red-700',
      hoverBg: 'hover:bg-red-50'
    },
    onClick: (organizations) => handleDelete(organizations),
    alwaysShow: true,
  }], []);

  // Columns configuration
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Organization',
      cell: ({ row }: any) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{row.original.name}</div>
            {row.original.organization_id === currentOrganization?.organization_id && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 mt-1">
                Current
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }: any) => (
        <div className="flex items-center text-sm text-gray-900">
          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
          <span className="tabular-nums">
            {row.original.created_at ? formatDate(row.original.created_at) : '-'}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('view', row.original)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('edit', row.original)}
            className="text-gray-600 hover:text-gray-900"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete([row.original])}
            className="text-red-600 hover:text-red-900"
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ], [currentOrganization]);

  return (
    <>
      <Helmet>
        <title>Organizations - Dashboard</title>
      </Helmet>

      <CRUDPage
        title="Organization Management"
        description="Manage organizations in the multi-tenant system. Each organization has its own data isolation and team management."
        data={organizations}
        isLoading={isLoading || isLoaderVisible}
        error={error}
        onCreateClick={handleCreateClick}
        customTable={
          <TableWithBulkActions
            data={organizations}
            columns={columns}
            loading={isLoading}
            getRowId={(org: Organization) => org.organization_id}
            bulkActions={bulkActions}
            createButtonLabel="New Organization"
            onCreateClick={handleCreateClick}
            onRowDoubleClick={(org) => openModal('edit', org)}
            searchable={true}
            enablePagination={true}
            pageSize={10}
            emptyMessage="No organizations found. Create your first organization to get started!"
          />
        }
      />

      {/* Organization Create/Edit Modal */}
      {modal.isOpen && (
        <OrganizationModal
          isOpen={modal.isOpen}
          mode={modal.mode}
          organization={modal.organization}
          onClose={closeModal}
          onSubmit={handleSubmit}
          isLoading={createOrganization.isPending || updateOrganization.isPending}
        />
      )}

      <Modal isOpen={showDeleteConfirm.show} onClose={closeDeleteConfirm} size="sm">
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>Delete organization?</ModalTitle>
            <ModalDescription>
              {showDeleteConfirm.organizations.length === 1 ? (
                <>
                  This action cannot be undone. The organization{' '}
                  <span className="font-medium text-neutral-900">
                    "{showDeleteConfirm.organizations[0]?.name || 'selected'}"
                  </span>{' '}
                  will be permanently deleted.
                  {showDeleteConfirm.organizations[0]?.organization_id === currentOrganization?.organization_id && (
                    <>
                      {' '}<strong>Warning:</strong> You are deleting your current organization.
                    </>
                  )}
                </>
              ) : (
                <>
                  This action will permanently delete <strong>{showDeleteConfirm.organizations.length}</strong> organizations.
                  This action cannot be undone.
                </>
              )}
            </ModalDescription>
          </ModalHeader>

          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteConfirm}
              disabled={deleteOrganization.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteOrganization.isPending}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
    </>
  );
}
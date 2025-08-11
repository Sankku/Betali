import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Building2 } from 'lucide-react';
import { CRUDPage } from '@/components/templates/crud-page';
import { BackendConfiguredTable } from '@/components/table/BackendConfiguredTable';
import { useTableConfig } from '@/hooks/useTableConfig';
import { Button } from '@/components/ui/button';
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

// Fallback table component with modern styling
interface OrganizationsTableProps {
  data: Organization[];
  onAction: (action: string, row: Organization) => void;
  isLoading: boolean;
}

function OrganizationsTable({ data, onAction, isLoading }: OrganizationsTableProps) {
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <div className="h-4 bg-neutral-200 rounded animate-pulse" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-neutral-100">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-neutral-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-200 rounded animate-pulse" />
                  <div className="h-3 bg-neutral-200 rounded animate-pulse w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="px-6 py-12 text-center">
            <Building2 className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No organizations found</h3>
            <p className="text-neutral-500 mb-4">Get started by creating your first organization.</p>
            <Button onClick={() => onAction('create', {} as Organization)}>
              Create Organization
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {data.map((organization) => (
                <tr key={organization.organization_id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-neutral-900 truncate">
                          {organization.name}
                        </div>
                        <div className="text-sm text-neutral-500 truncate">
                          {organization.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-neutral-900 max-w-xs truncate">
                      {organization.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        organization.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      {organization.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-500">
                    {new Date(organization.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAction('edit', organization)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAction('delete', organization)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  organization?: Organization;
}

interface DeleteConfirmState {
  show: boolean;
  organization?: Organization;
}

export function OrganizationsPage() {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
  });

  // Use the new table configuration system
  const {
    data: tableConfig,
    isLoading: configLoading,
    error: configError,
  } = useTableConfig('organizations');
  
  const { data: organizations = [], isLoading, error } = useOrganizationManagement();
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

  const handleDelete = async (organization: Organization) => {
    if (!organization?.organization_id) {
      console.error('Organization ID is missing:', organization);
      return;
    }
    setShowDeleteConfirm({ show: true, organization });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.organization?.organization_id) {
      try {
        await deleteOrganization.mutateAsync(showDeleteConfirm.organization.organization_id);
        setShowDeleteConfirm({ show: false });
      } catch (error) {
        console.error('Error deleting:', error);
      }
    } else {
      console.error('Cannot delete: Organization ID is missing');
    }
  };

  const closeDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm({ show: false });
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

  // Handle table actions from the configurable table
  const handleTableAction = useCallback((action: string, row: Organization) => {
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
      case 'create':
        openModal('create');
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }, []);

  const isLoaderVisible =
    createOrganization.isPending || updateOrganization.isPending || deleteOrganization.isPending;

  return (
    <>
      <Helmet>
        <title>Organizations - Dashboard</title>
      </Helmet>

      <CRUDPage
        title={(tableConfig as any)?.name || 'Organization Management'}
        description={
          configLoading
            ? 'Loading table configuration...'
            : 'Manage organizations and their settings'
        }
        data={organizations}
        isLoading={isLoading || isLoaderVisible || configLoading}
        error={error || configError}
        onCreateClick={handleCreateClick}
        customTable={
          tableConfig ? (
            <BackendConfiguredTable
              config={tableConfig as any}
              data={organizations}
              onAction={handleTableAction}
              isLoading={isLoading || isLoaderVisible}
            />
          ) : (
            <OrganizationsTable
              data={organizations}
              onAction={handleTableAction}
              isLoading={isLoading || isLoaderVisible}
            />
          )
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
              This action cannot be undone. The organization{' '}
              <span className="font-medium text-neutral-900">
                "{showDeleteConfirm.organization?.name || 'selected'}"
              </span>{' '}
              will be permanently deleted.
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
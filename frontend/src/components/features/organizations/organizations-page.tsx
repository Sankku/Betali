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
import { useOrganization } from '@/context/OrganizationContext';


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
  const { currentOrganization } = useOrganization();
  
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

  const handleDelete = async (organization: Organization) => {
    if (!organization?.organization_id) {
      console.error('Organization ID is missing:', organization);
      return;
    }
    
    // Check if this is the user's only organization
    if (userOrganizations.length === 1) {
      // Show different modal for last organization
      setShowDeleteConfirm({ show: true, organization });
      return;
    }
    
    setShowDeleteConfirm({ show: true, organization });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.organization?.organization_id) {
      try {
        const isLastOrganization = userOrganizations.length === 1;
        const isDeletingCurrentOrg = currentOrganization?.organization_id === showDeleteConfirm.organization.organization_id;
        
        await deleteOrganization.mutateAsync(showDeleteConfirm.organization.organization_id);
        setShowDeleteConfirm({ show: false });
        
        // If user deleted their only organization or their current organization,
        // they'll be redirected to the no-organization fallback automatically
        // by the context when it refetches
        if (isLastOrganization || isDeletingCurrentOrg) {
          // The OrganizationContext will handle the redirect automatically
          console.log('User deleted their', isLastOrganization ? 'last organization' : 'current organization');
        }
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
            : 'Manage organizations in the multi-tenant system. Each organization has its own data isolation and team management.'
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
          ) : null
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
            <ModalTitle>
              {userOrganizations.length === 1 ? 'Delete your only organization?' : 'Delete organization?'}
            </ModalTitle>
            <ModalDescription>
              {userOrganizations.length === 1 ? (
                <>
                  <strong>Warning:</strong> This is your only organization. Deleting{' '}
                  <span className="font-medium text-neutral-900">
                    "{showDeleteConfirm.organization?.name || 'selected'}"
                  </span>{' '}
                  will leave you without access to any organization features. 
                  You'll need to create a new organization or be invited to an existing one to continue using Betali.
                </>
              ) : (
                <>
                  This action cannot be undone. The organization{' '}
                  <span className="font-medium text-neutral-900">
                    "{showDeleteConfirm.organization?.name || 'selected'}"
                  </span>{' '}
                  will be permanently deleted.
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
              {userOrganizations.length === 1 ? 'Delete anyway' : 'Delete'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
    </>
  );
}
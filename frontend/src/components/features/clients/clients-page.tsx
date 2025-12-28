import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Building, Search, UserCheck, TrendingUp, Eye, Edit, Trash } from 'lucide-react';
import { CRUDPage } from '@/components/templates/crud-page';
import { TableWithBulkActions, BulkAction } from '@/components/ui/table-with-bulk-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToastContainer } from '@/components/ui/toast';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui';
import { ClientModal, Client } from './client-modal';
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useSearchClients,
  useClientStats,
  CreateClientData,
} from '@/hooks/useClients';
import { useTranslation } from '@/contexts/LanguageContext';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  client?: Client;
}

interface DeleteConfirmState {
  show: boolean;
  clients: Client[];
}

export function ClientsPage() {
  const { t } = useTranslation();
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    clients: [],
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState({});

  const { data: clientsResponse, isLoading, error } = useClients({ searchOptions });
  const clients = clientsResponse?.data || [];
  const { data: clientStats } = useClientStats();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const searchClients = useSearchClients();

  const openModal = (mode: ModalState['mode'], client?: Client) => {
    setModal({ isOpen: true, mode, client });
  };

  const closeModal = () => {
    setModal({ isOpen: false, mode: 'create', client: undefined });
  };

  const handleCreateClick = () => openModal('create');

  const handleDelete = (clients: Client[]) => {
    setShowDeleteConfirm({ show: true, clients });
  };

  const confirmDelete = async () => {
    try {
      const promises = showDeleteConfirm.clients.map(client =>
        deleteClient.mutateAsync(client.client_id)
      );
      await Promise.all(promises);
      setShowDeleteConfirm({ show: false, clients: [] });
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const closeDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm({ show: false, clients: [] });
  }, []);

  const handleSubmit = async (data: CreateClientData) => {
    try {
      if (modal.mode === 'create') {
        await createClient.mutateAsync(data);
      } else if (modal.mode === 'edit' && modal.client?.client_id) {
        await updateClient.mutateAsync({
          id: modal.client.client_id,
          data: data,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  // Format CUIT for display
  const formatCuit = (cuit: string) => {
    if (!cuit) return '';
    const cleaned = cuit.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 10)}-${cleaned.slice(10)}`;
    }
    return cuit;
  };

  // Bulk actions
  const bulkActions: BulkAction<Client>[] = useMemo(() => [
    {
      key: 'delete',
      label: t('common.delete'),
      icon: Trash,
      colorScheme: {
        bg: 'bg-white',
        border: 'border-red-300',
        text: 'text-red-700',
        hoverBg: 'hover:bg-red-50'
      },
      onClick: (clients) => handleDelete(clients),
      alwaysShow: true,
    },
  ], [t]);

  // Table columns
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('clients.fields.name'),
      cell: ({ row }: { row: any }) => {
        const client = row.original as Client;
        return (
          <div>
            <div className="flex items-center">
              <UserCheck className="w-4 h-4 text-gray-400 mr-2" />
              <div className="text-sm font-medium text-gray-900">{client.name}</div>
            </div>
            <div className="text-sm text-gray-500">{client.email}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'cuit',
      header: t('clients.fields.taxId'),
      cell: ({ row }: { row: any }) => (
        <div className="text-sm text-gray-900 font-mono">
          {formatCuit(row.original.cuit)}
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: t('clients.fields.phone'),
      cell: ({ row }: { row: any }) => (
        <div className="text-sm text-gray-900">{row.original.phone || '-'}</div>
      ),
    },
    {
      accessorKey: 'address',
      header: t('clients.fields.address'),
      cell: ({ row }: { row: any }) => (
        <div className="text-sm text-gray-900 max-w-xs truncate">
          {row.original.address || '-'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }: { row: any }) => {
        const client = row.original as Client;
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openModal('view', client)}
              className="text-blue-600 hover:text-blue-900"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openModal('edit', client)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ], [formatCuit, t]);

  // Handle search
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        await searchClients.mutateAsync({ query: searchQuery.trim() });
      } catch (error) {
        console.error('Search failed:', error);
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchOptions({});
  };

  // Stats cards data
  const statsCards = useMemo(() => [
    {
      title: t('common.total') + ' ' + t('clients.title'),
      value: clientStats?.total ?? 0,
      icon: Building,
      color: 'blue',
    },
    {
      title: t('common.active'),
      value: clientStats?.active ?? 0,
      icon: UserCheck,
      color: 'green',
    },
    {
      title: t('common.total'),
      value: clientStats?.recentlyAdded ?? 0,
      icon: TrendingUp,
      color: 'purple',
    },
  ], [clientStats, t]);

  return (
    <>
      <Helmet>
        <title>{t('clients.title')} - Betali</title>
        <meta
          name="description"
          content={t('clients.title')}
        />
      </Helmet>

      <CRUDPage
        title={t('clients.title')}
        description={t('clients.title')}
        data={clients}
        isLoading={isLoading}
        error={error}
        onCreateClick={handleCreateClick}
        isAnyMutationLoading={createClient.isPending}
        beforeTable={
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {statsCards.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                        <IconComponent className={`w-6 h-6 text-${stat.color}-600`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Search Section */}
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || searchClients.isPending}
              >
                {searchClients.isPending ? t('common.loading') : t('common.search')}
              </Button>
              {searchQuery && (
                <Button variant="outline" onClick={clearSearch}>
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </div>
        }
        customTable={
          <TableWithBulkActions
            data={clients}
            columns={columns}
            loading={isLoading}
            getRowId={(client: Client) => client.client_id}
            bulkActions={bulkActions}
            createButtonLabel={t('clients.add')}
            createButtonId="create-client-button"
            onCreateClick={handleCreateClick}
            onRowDoubleClick={(client) => openModal('edit', client)}
            searchable={false}
            enablePagination={true}
            pageSize={10}
            emptyMessage={t('common.noResults')}
          />
        }
      />

      {/* Client Modal */}
      <ClientModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        mode={modal.mode}
        client={modal.client}
        isLoading={
          modal.mode === 'create' ? createClient.isPending : updateClient.isPending
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm.show} onClose={closeDeleteConfirm}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t('confirmations.deleteTitle')}
            </ModalTitle>
            <ModalDescription>
              {showDeleteConfirm.clients.length === 1
                ? t('clients.deleteConfirmSingle')
                : t('clients.deleteConfirm', { count: showDeleteConfirm.clients.length.toString() })
              }
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={closeDeleteConfirm}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteClient.isPending}
            >
              {deleteClient.isPending ? t('common.loading') : t('common.delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
    </>
  );
}
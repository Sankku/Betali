import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Percent, Settings, AlertCircle, Eye, Edit, Trash, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableWithBulkActions, BulkAction } from '@/components/ui/table-with-bulk-actions';
import { TaxRateModal } from '@/components/features/taxes/tax-rate-modal';
import { DashboardLayout } from '@/components/layout/Dashboard';
import { useTaxRates, useDeleteTaxRate, TaxRate } from '@/hooks/useTaxRates';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency } from '@/lib/utils';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui';

export default function TaxManagement() {
  const { currentOrganization } = useOrganization();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    show: boolean;
    taxRates: TaxRate[];
  }>({ show: false, taxRates: [] });

  const { data: taxRates, isLoading } = useTaxRates();
  const deleteTaxRate = useDeleteTaxRate();

  const handleCreate = () => {
    setSelectedTaxRate(undefined);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (taxRate: TaxRate) => {
    setSelectedTaxRate(taxRate);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (taxRate: TaxRate) => {
    setSelectedTaxRate(taxRate);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = (taxRates: TaxRate[]) => {
    if (!taxRates || taxRates.length === 0) {
      console.error('No tax rates selected');
      return;
    }
    setShowDeleteConfirm({ show: true, taxRates });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.taxRates.length > 0) {
      try {
        for (const rate of showDeleteConfirm.taxRates) {
          if (rate.tax_rate_id) {
            await deleteTaxRate.mutateAsync(rate.tax_rate_id);
          }
        }
        setShowDeleteConfirm({ show: false, taxRates: [] });
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm({ show: false, taxRates: [] });
  };

  // Bulk actions configuration
  const bulkActions: BulkAction<TaxRate>[] = useMemo(() => [{
    key: 'delete',
    label: 'Delete',
    icon: Trash,
    colorScheme: {
      bg: 'bg-white',
      border: 'border-red-300',
      text: 'text-red-700',
      hoverBg: 'hover:bg-red-50'
    },
    onClick: (rates) => handleDelete(rates),
    alwaysShow: true,
  }], []);

  // Columns configuration
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Tax Rate Name',
      cell: ({ row }: any) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.original.name}</div>
          {row.original.description && (
            <div className="text-sm text-gray-500">{row.original.description}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'rate',
      header: 'Rate',
      cell: ({ row }: any) => (
        <div className="flex items-center">
          <Percent className="w-4 h-4 text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-900">
            {(row.original.rate * 100).toFixed(2)}%
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'is_inclusive',
      header: 'Type',
      cell: ({ row }: any) => (
        <Badge variant="outline">
          {row.original.is_inclusive ? 'Inclusive' : 'Exclusive'}
        </Badge>
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
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(row.original)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row.original)}
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
  ], []);


  return (
    <>
      <Helmet>
        <title>Tax Management | Betali</title>
      </Helmet>
      
      <DashboardLayout>
        <div className="space-y-6">
      {/* Header Section */}


      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Active Tax Rates</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {taxRates?.data?.filter(rate => rate.is_active).length || 0}
            </div>
            <p className="text-xs text-gray-800">
              Currently active rates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Average Tax Rate</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {taxRates?.data && taxRates.data.length > 0
                ? `${((taxRates.data.reduce((sum, rate) => sum + rate.rate, 0) / taxRates.data.length) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-gray-800">
              Across all tax rates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Total Tax Rates</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {taxRates?.data?.length || 0}
            </div>
            <p className="text-xs text-gray-800">
              Including inactive rates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Rate Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Common Tax Rate Examples
          </CardTitle>
          <CardDescription className="text-gray-800">
            Here are some typical tax rates you might need for your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">Standard VAT/IVA</h4>
              <div className="space-y-1 text-sm text-gray-800">
                <div>• Argentina: 21%</div>
                <div>• Mexico: 16%</div>
                <div>• Colombia: 19%</div>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">Reduced VAT/IVA</h4>
              <div className="space-y-1 text-sm text-gray-800">
                <div>• Food items: 10.5%</div>
                <div>• Books/Education: 0-5%</div>
                <div>• Medicine: 0%</div>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">Sales Tax (US)</h4>
              <div className="space-y-1 text-sm text-gray-800">
                <div>• State sales tax: 0-10%</div>
                <div>• Local tax: 0-3%</div>
                <div>• Combined: varies by location</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Tax Rates</CardTitle>
          <CardDescription className="text-gray-800">
            Manage all your tax rates and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <TableWithBulkActions
            data={taxRates?.data || []}
            columns={columns}
            loading={isLoading}
            getRowId={(rate: TaxRate) => rate.tax_rate_id}
            bulkActions={bulkActions}
            createButtonLabel="Add Tax Rate"
            onCreateClick={handleCreate}
            onRowDoubleClick={(rate) => handleEdit(rate)}
            searchable={true}
            enablePagination={true}
            pageSize={10}
            emptyMessage={
              !currentOrganization
                ? "Please select or create an organization to access tax management features."
                : "No tax rates created yet. Create your first tax rate to get started!"
            }
          />
        </CardContent>
      </Card>

      {/* Modal */}
      <TaxRateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        taxRate={selectedTaxRate}
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm.show} onClose={closeDeleteConfirm} size="sm">
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>Delete tax rate?</ModalTitle>
            <ModalDescription>
              {showDeleteConfirm.taxRates.length === 1 ? (
                <>
                  This action cannot be undone. The tax rate{' '}
                  <span className="font-medium text-neutral-900">
                    "{showDeleteConfirm.taxRates[0]?.name || 'selected'}"
                  </span>{' '}
                  will be permanently deleted.
                </>
              ) : (
                <>
                  This action will permanently delete <strong>{showDeleteConfirm.taxRates.length}</strong> tax rates.
                  This action cannot be undone.
                </>
              )}
            </ModalDescription>
          </ModalHeader>

          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteConfirm}
              disabled={deleteTaxRate.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteTaxRate.isPending}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
        </div>
      </DashboardLayout>
    </>
  );
}
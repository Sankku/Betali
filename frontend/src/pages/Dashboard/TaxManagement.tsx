import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Percent, Settings, AlertCircle, Eye, Edit, Trash, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
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
  const { t } = useTranslation();
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
    label: t('common.delete'),
    icon: Trash,
    colorScheme: {
      bg: 'bg-white',
      border: 'border-red-300',
      text: 'text-red-700',
      hoverBg: 'hover:bg-red-50'
    },
    onClick: (rates) => handleDelete(rates),
    alwaysShow: true,
  }], [t]);

  // Columns configuration
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('taxManagement.page.columnName'),
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
      header: t('taxManagement.page.columnRate'),
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
      header: t('taxManagement.page.columnType'),
      cell: ({ row }: any) => (
        <Badge variant="outline">
          {row.original.is_inclusive ? t('taxManagement.page.inclusive') : t('taxManagement.page.exclusive')}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: t('common.status'),
      cell: ({ row }: any) => (
        <Badge
          variant={row.original.is_active ? "default" : "secondary"}
          className={row.original.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
        >
          {row.original.is_active ? t('common.active') : t('common.inactive')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: t('common.actions'),
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
            className="text-danger-600 hover:text-danger-800"
          >
            <Trash className="w-4 h-4 text-danger-600" />
          </Button>
        </div>
      ),
    },
  ], [t]);


  return (
    <>
      <Helmet>
        <title>{t('taxManagement.page.title')}</title>
      </Helmet>
      
      <DashboardLayout>
        <div className="space-y-6">
      {/* Header Section */}


      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">{t('taxManagement.page.statsActiveTitle')}</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {taxRates?.data?.filter(rate => rate.is_active).length || 0}
            </div>
            <p className="text-xs text-gray-800">
              {t('taxManagement.page.statsActiveDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">{t('taxManagement.page.statsAverageTitle')}</CardTitle>
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
              {t('taxManagement.page.statsAverageDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">{t('taxManagement.page.statsTotalTitle')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {taxRates?.data?.length || 0}
            </div>
            <p className="text-xs text-gray-800">
              {t('taxManagement.page.statsTotalDesc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Rate Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            {t('taxManagement.page.examplesTitle')}
          </CardTitle>
          <CardDescription className="text-gray-800">
            {t('taxManagement.page.examplesDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">{t('taxManagement.page.exampleStandardVat')}</h4>
              <div className="space-y-1 text-sm text-gray-800">
                <div>• Argentina: 21%</div>
                <div>• Mexico: 16%</div>
                <div>• Colombia: 19%</div>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">{t('taxManagement.page.exampleReducedVat')}</h4>
              <div className="space-y-1 text-sm text-gray-800">
                <div>• {t('taxManagement.page.exampleReducedItem1')}</div>
                <div>• {t('taxManagement.page.exampleReducedItem2')}</div>
                <div>• {t('taxManagement.page.exampleReducedItem3')}</div>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">{t('taxManagement.page.exampleSalesTax')}</h4>
              <div className="space-y-1 text-sm text-gray-800">
                <div>• {t('taxManagement.page.exampleSalesItem1')}</div>
                <div>• {t('taxManagement.page.exampleSalesItem2')}</div>
                <div>• {t('taxManagement.page.exampleSalesItem3')}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">{t('taxManagement.page.tableTitle')}</CardTitle>
          <CardDescription className="text-gray-800">
            {t('taxManagement.page.tableDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <TableWithBulkActions
            data={taxRates?.data || []}
            columns={columns}
            loading={isLoading}
            getRowId={(rate: TaxRate) => rate.tax_rate_id}
            bulkActions={bulkActions}
            createButtonLabel={t('taxManagement.page.addTaxRate')}
            onCreateClick={handleCreate}
            onRowDoubleClick={(rate) => handleEdit(rate)}
            searchable={true}
            enablePagination={true}
            pageSize={25}
            emptyMessage={
              !currentOrganization
                ? t('taxManagement.page.emptyNoOrg')
                : t('taxManagement.page.emptyNoRates')
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
            <ModalTitle>{t('taxManagement.page.deleteTitle')}</ModalTitle>
            <ModalDescription>
              {showDeleteConfirm.taxRates.length === 1 ? (
                t('taxManagement.page.deleteSingleDesc', { name: showDeleteConfirm.taxRates[0]?.name || 'selected' })
              ) : (
                t('taxManagement.page.deleteMultipleDesc', { count: String(showDeleteConfirm.taxRates.length) })
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
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteTaxRate.isPending}
              className="w-full sm:w-auto"
            >
              {t('common.delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
        </div>
      </DashboardLayout>
    </>
  );
}
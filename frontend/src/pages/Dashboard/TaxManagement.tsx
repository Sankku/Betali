import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Percent, Settings, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BackendConfiguredTable } from '@/components/table/BackendConfiguredTable';
import { TaxRateModal } from '@/components/features/taxes/tax-rate-modal';
import { DashboardLayout } from '@/components/layout/Dashboard';
import { useTaxRates, TaxRate } from '@/hooks/useTaxRates';
import { formatCurrency } from '@/lib/utils';

export default function TaxManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  const { data: taxRates, isLoading } = useTaxRates();

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

  const tableConfig = {
    endpoint: '/api/pricing/taxes/rates',
    columns: [
      {
        key: 'name',
        title: 'Tax Name',
        render: (value: string, row: TaxRate) => (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{value}</span>
            {row.description && (
              <span className="text-sm text-gray-700">{row.description}</span>
            )}
          </div>
        )
      },
      {
        key: 'rate',
        title: 'Tax Rate',
        render: (value: number) => (
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-gray-600" />
            <span className="font-semibold text-gray-900">
              {(value * 100).toFixed(2)}%
            </span>
          </div>
        )
      },
      {
        key: 'is_inclusive',
        title: 'Type',
        render: (value: boolean) => (
          <Badge variant={value ? 'secondary' : 'outline'} className="font-medium">
            {value ? 'Tax Inclusive' : 'Tax Exclusive'}
          </Badge>
        )
      },
      {
        key: 'is_active',
        title: 'Status',
        render: (value: boolean) => (
          <Badge 
            variant={value ? 'success' : 'secondary'} 
            className={value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
          >
            {value ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
      {
        key: 'created_at',
        title: 'Created',
        render: (value: string) => (
          <span className="text-gray-800">
            {new Date(value).toLocaleDateString()}
          </span>
        )
      }
    ],
    actions: {
      view: handleView,
      edit: handleEdit,
    },
    searchPlaceholder: "Search tax rates...",
    emptyState: {
      title: "No Tax Rates Found",
      description: "Create your first tax rate to start managing taxes for your products.",
      icon: Percent
    }
  };

  return (
    <>
      <Helmet>
        <title>Tax Management | Betali</title>
      </Helmet>
      
      <DashboardLayout>
        <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Management</h1>
          <p className="text-gray-800 mt-1">
            Configure tax rates and rules for your products and orders
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Tax Rate
        </Button>
      </div>

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
          <BackendConfiguredTable
            config={tableConfig}
            isLoading={isLoading}
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
        </div>
      </DashboardLayout>
    </>
  );
}
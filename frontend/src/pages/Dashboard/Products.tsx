import React, { useCallback, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Upload, Rows3, AlertTriangle, Package, Loader2, Search, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { DashboardLayout } from '../../components/layout/Dashboard';
import { ToastContainer } from '../../components/ui/toast';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '../../components/ui';
import { ProductTypeAccordion } from '../../components/features/products/ProductTypeAccordion';
import { ProductTypeSidePanel } from '../../components/features/products/ProductTypeSidePanel';
import { ProductLotSidePanel } from '../../components/features/products/ProductLotSidePanel';
import { ProductImportModal } from '../../components/features/products/product-import-modal';
import { ProductBulkCreateModal } from '../../components/features/products/product-bulk-create-modal';
import {
  useProductTypes,
  useCreateProductType,
  useUpdateProductType,
  useDeleteProductType,
} from '../../hooks/useProductTypes';
import {
  useCreateProductLot,
  useUpdateProductLot,
  useDeleteProductLot,
} from '../../hooks/useProductLots';
import { useWarehouses } from '../../hooks/useWarehouse';
import { useOrganization } from '../../context/OrganizationContext';
import { useTranslation } from '../../contexts/LanguageContext';
import type { ProductType, ProductTypeFormData } from '../../services/api/productTypesService';
import type { ProductLot, ProductLotFormData } from '../../services/api/productLotsService';

interface TypePanelState {
  isOpen: boolean;
  productType?: ProductType;
}

interface LotPanelState {
  isOpen: boolean;
  productType?: ProductType;
  lot?: ProductLot;
}

interface DeleteTypeState {
  show: boolean;
  productType?: ProductType;
}

interface DeleteLotState {
  show: boolean;
  lot?: ProductLot;
}

const ProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const [typePanelState, setTypePanelState] = useState<TypePanelState>({ isOpen: false });
  const [lotPanelState, setLotPanelState] = useState<LotPanelState>({ isOpen: false });
  const [deleteTypeState, setDeleteTypeState] = useState<DeleteTypeState>({ show: false });
  const [deleteLotState, setDeleteLotState] = useState<DeleteLotState>({ show: false });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');

  const { currentUserRole } = useOrganization();
  const canSeePrices = ['super_admin', 'admin', 'manager'].includes(currentUserRole?.toLowerCase() ?? '');

  const { data: productTypes, isLoading, error } = useProductTypes();
  const { data: warehouses } = useWarehouses({ enabled: true });
  const createProductType = useCreateProductType();
  const updateProductType = useUpdateProductType();
  const deleteProductType = useDeleteProductType();
  const createProductLot = useCreateProductLot();
  const updateProductLot = useUpdateProductLot();
  const deleteProductLot = useDeleteProductLot();

  // Type panel handlers
  const openCreateType = () => setTypePanelState({ isOpen: true, productType: undefined });
  const openEditType = (productType: ProductType) => setTypePanelState({ isOpen: true, productType });
  const closeTypePanel = useCallback(() => setTypePanelState({ isOpen: false }), []);

  const handleTypeSubmit = async (data: ProductTypeFormData) => {
    if (typePanelState.productType) {
      await updateProductType.mutateAsync({
        id: typePanelState.productType.product_type_id,
        data,
      });
    } else {
      await createProductType.mutateAsync(data);
    }
  };

  // Lot panel handlers
  const openAddLot = (productType: ProductType) =>
    setLotPanelState({ isOpen: true, productType, lot: undefined });
  const openEditLot = (lot: ProductLot, productType: ProductType) =>
    setLotPanelState({ isOpen: true, productType, lot });
  const closeLotPanel = useCallback(() => setLotPanelState({ isOpen: false }), []);

  const handleLotSubmit = async (data: ProductLotFormData) => {
    if (lotPanelState.lot) {
      await updateProductLot.mutateAsync({ id: lotPanelState.lot.lot_id, data });
    } else if (lotPanelState.productType) {
      await createProductLot.mutateAsync({
        typeId: lotPanelState.productType.product_type_id,
        data,
      });
    }
  };

  // Delete type handlers
  const openDeleteType = (productType: ProductType) =>
    setDeleteTypeState({ show: true, productType });
  const closeDeleteType = useCallback(() => setDeleteTypeState({ show: false }), []);

  const confirmDeleteType = async () => {
    if (!deleteTypeState.productType) return;
    try {
      await deleteProductType.mutateAsync(deleteTypeState.productType.product_type_id);
      closeDeleteType();
    } catch {
      // error handled in hook
    }
  };

  // Delete lot handlers
  const openDeleteLot = (lot: ProductLot) => setDeleteLotState({ show: true, lot });
  const closeDeleteLot = useCallback(() => setDeleteLotState({ show: false }), []);

  const confirmDeleteLot = async () => {
    if (!deleteLotState.lot) return;
    try {
      await deleteProductLot.mutateAsync(deleteLotState.lot.lot_id);
      closeDeleteLot();
    } catch {
      // error handled in hook
    }
  };

  const types = useMemo(() => {
    let list = productTypes ?? [];
    // Only apply typeFilter at page level — text search is handled inside each
    // ProductTypeRow so that lot-number matches can auto-expand the right rows.
    if (typeFilter) {
      list = list.filter(t => t.product_type === typeFilter);
    }
    return list;
  }, [productTypes, typeFilter]);

  return (
    <>
      <Helmet>
        <title>{t('products.page.heading')} - Dashboard</title>
      </Helmet>

      <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
              <Package className="h-6 w-6 text-primary-600" />
              {t('products.page.heading')}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {t('products.page.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {t('products.page.importCsv')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsBulkCreateOpen(true)}
              className="flex items-center gap-2"
            >
              <Rows3 className="h-4 w-4" />
              Agregar en masa
            </Button>
            <Button onClick={openCreateType} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('products.page.newProduct')}
            </Button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            <Input
              placeholder={t('products.page.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['', 'standard', 'raw_material', 'finished_good'] as const).map((val) => {
              const labels: Record<string, string> = {
                '': t('products.page.filterAll'),
                standard: t('products.page.filterStandard'),
                raw_material: t('products.page.filterRawMaterial'),
                finished_good: t('products.page.filterFinishedGood'),
              };
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTypeFilter(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    typeFilter === val
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  {labels[val]}
                </button>
              );
            })}

            {/* Warehouse filter */}
            {warehouses?.data && warehouses.data.length > 0 && (
              <select
                value={warehouseFilter}
                onChange={e => setWarehouseFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('products.page.filterAllWarehouses')}</option>
                {warehouses.data.map(w => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            {t('products.page.loading')}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            {t('products.page.errorLoading')}
          </div>
        ) : types.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
              <Package className="h-8 w-8 text-neutral-400" />
            </div>
            <div>
              <p className="text-neutral-700 font-medium">{t('products.page.emptyTitle')}</p>
              <p className="text-neutral-500 text-sm mt-1">
                {t('products.page.emptyDesc')}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                {t('products.page.importCsv')}
              </Button>
              <Button variant="outline" onClick={() => setIsBulkCreateOpen(true)}>
                <Rows3 className="h-4 w-4 mr-2" />
                Agregar en masa
              </Button>
              <Button onClick={openCreateType}>
                <Plus className="h-4 w-4 mr-2" />
                {t('products.page.newProduct')}
              </Button>
            </div>
          </div>
        ) : (
          <ProductTypeAccordion
            productTypes={types}
            lotSearch={searchQuery.trim() || undefined}
            warehouseFilter={warehouseFilter || undefined}
            canSeePrices={canSeePrices}
            onEditType={openEditType}
            onDeleteType={openDeleteType}
            onAddLot={openAddLot}
            onEditLot={openEditLot}
            onDeleteLot={openDeleteLot}
          />
        )}
      </div>

      {/* Type Side Panel */}
      <ProductTypeSidePanel
        isOpen={typePanelState.isOpen}
        onClose={closeTypePanel}
        onSubmit={handleTypeSubmit}
        productType={typePanelState.productType}
        isLoading={createProductType.isPending || updateProductType.isPending}
      />

      {/* Lot Side Panel */}
      <ProductLotSidePanel
        isOpen={lotPanelState.isOpen}
        onClose={closeLotPanel}
        onSubmit={handleLotSubmit}
        lot={lotPanelState.lot}
        productTypeName={lotPanelState.productType?.name}
        isLoading={createProductLot.isPending || updateProductLot.isPending}
      />

      {/* Import Modal */}
      <ProductImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Bulk Create Modal */}
      <ProductBulkCreateModal
        isOpen={isBulkCreateOpen}
        onClose={() => setIsBulkCreateOpen(false)}
      />

      {/* Delete Type Confirm */}
      <Modal isOpen={deleteTypeState.show} onClose={closeDeleteType} size="sm">
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>{t('products.page.deleteTypeTitle')}</ModalTitle>
            <ModalDescription>
              {deleteTypeState.productType && t('products.page.deleteTypeDesc', {
                name: deleteTypeState.productType.name,
                sku: deleteTypeState.productType.sku,
              })}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteType}
              disabled={deleteProductType.isPending}
              className="w-full sm:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteType}
              loading={deleteProductType.isPending}
              className="w-full sm:w-auto"
            >
              {t('common.delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Lot Confirm */}
      <Modal isOpen={deleteLotState.show} onClose={closeDeleteLot} size="sm">
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>{t('products.page.deleteLotTitle')}</ModalTitle>
            <ModalDescription>
              {deleteLotState.lot && t('products.page.deleteLotDesc', {
                lot_number: deleteLotState.lot.lot_number,
              })}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteLot}
              disabled={deleteProductLot.isPending}
              className="w-full sm:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteLot}
              loading={deleteProductLot.isPending}
              className="w-full sm:w-auto"
            >
              {t('common.delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
      </DashboardLayout>
    </>
  );
};

export default ProductsPage;

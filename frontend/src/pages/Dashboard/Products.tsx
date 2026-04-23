import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Upload, Rows3, AlertTriangle, Package, Loader2, Search, X, Trash2, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { DashboardLayout } from '../../components/layout/Dashboard';
import { ToastContainer } from '../../components/ui/toast';
import { toast } from '../../lib/toast';
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
import { useQueryClient } from '@tanstack/react-query';
import {
  useProductTypesInfinite,
  useCreateProductType,
  useUpdateProductType,
  useDeleteProductType,
} from '../../hooks/useProductTypes';
import { productTypesService } from '../../services/api/productTypesService';
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
  const queryClient = useQueryClient();
  const observerTarget = useRef<HTMLDivElement>(null);
  const [typePanelState, setTypePanelState] = useState<TypePanelState>({ isOpen: false });
  const [lotPanelState, setLotPanelState] = useState<LotPanelState>({ isOpen: false });
  const [deleteTypeState, setDeleteTypeState] = useState<DeleteTypeState>({ show: false });
  const [deleteLotState, setDeleteLotState] = useState<DeleteLotState>({ show: false });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Product-level filter state
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState(''); // debounced
  const [typeFilter, setTypeFilter] = useState<string>('');
  const PAGE_SIZE = 100;

  // Lot-level filter state
  const [showLotFilters, setShowLotFilters] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [lotSearchInput, setLotSearchInput] = useState('');
  const [lotSearch, setLotSearch] = useState(''); // debounced
  const [lotCreatedFrom, setLotCreatedFrom] = useState('');
  const [lotCreatedTo, setLotCreatedTo] = useState('');
  const [lotExpirationFrom, setLotExpirationFrom] = useState('');
  const [lotExpirationTo, setLotExpirationTo] = useState('');

  const activeLotFilterCount = [warehouseFilter, lotSearch, lotCreatedFrom, lotCreatedTo, lotExpirationFrom, lotExpirationTo].filter(Boolean).length;

  const clearLotFilters = () => {
    setWarehouseFilter('');
    setLotSearchInput('');
    setLotSearch('');
    setLotCreatedFrom('');
    setLotCreatedTo('');
    setLotExpirationFrom('');
    setLotExpirationTo('');
  };

  // Debounce product search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Debounce lot search
  useEffect(() => {
    const timer = setTimeout(() => {
      setLotSearch(lotSearchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [lotSearchInput]);

  const { currentUserRole } = useOrganization();
  const canSeePrices = ['super_admin', 'admin', 'manager'].includes(currentUserRole?.toLowerCase() ?? '');

  const {
    data: infiniteData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useProductTypesInfinite({ limit: PAGE_SIZE, search, type: typeFilter });

  const productTypes = infiniteData?.pages.flatMap(page => page.data) ?? [];
  const meta = infiniteData?.pages[0]?.meta;

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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
      return createProductType.mutateAsync(data);
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

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(productTypes.map(pt => pt.product_type_id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [productTypes]);

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const result = await productTypesService.bulkDelete([...selectedIds]);
      if (result.blocked > 0) {
        toast.error(`No se pudieron eliminar ${result.blocked} productos porque tienen lotes/stock asociados.`);
      }
      if (result.deleted > 0) {
        toast.success(`Se eliminaron exitosamente ${result.deleted} productos.`);
      }
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      queryClient.invalidateQueries({ queryKey: ['product-types-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['product-types-infinite'] });
      setSelectedIds(new Set());
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };


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
              {!isLoading && meta && meta.total > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                  {meta.total} {meta.total === 1 ? 'producto' : 'productos'}
                </span>
              )}
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
        <div className="flex flex-col gap-2">
          {/* Row 1: product search + type pills + lot filters toggle */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              <Input
                placeholder={t('products.page.searchPlaceholder')}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(''); setSearch(''); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      typeFilter === val
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {labels[val]}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowLotFilters(v => !v)}
              className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                showLotFilters || activeLotFilterCount > 0
                  ? 'bg-primary-50 text-primary-700 border-primary-300'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros de lotes
              {activeLotFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary-600 text-white text-[10px] font-semibold">
                  {activeLotFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Row 2: lot-level filters (collapsible) */}
          {showLotFilters && (
            <div className="flex flex-wrap items-end gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
              {/* Lot number search */}
              <div className="flex flex-col gap-1 min-w-[160px]">
                <label className="text-xs font-medium text-neutral-500">Nro. de lote</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
                  <Input
                    placeholder="Buscar lote…"
                    value={lotSearchInput}
                    onChange={e => setLotSearchInput(e.target.value)}
                    className="pl-8 pr-7 h-8 text-xs"
                  />
                  {lotSearchInput && (
                    <button
                      type="button"
                      onClick={() => { setLotSearchInput(''); setLotSearch(''); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Warehouse filter */}
              {warehouses?.data && warehouses.data.length > 0 && (
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <label className="text-xs font-medium text-neutral-500">Almacén</label>
                  <select
                    value={warehouseFilter}
                    onChange={e => setWarehouseFilter(e.target.value)}
                    className="h-8 px-2.5 rounded-lg text-xs font-medium border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  >
                    <option value="">Todos los almacenes</option>
                    {warehouses.data.map(w => (
                      <option key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Created date range */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500">Fabricado entre</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={lotCreatedFrom}
                    onChange={e => setLotCreatedFrom(e.target.value)}
                    className="h-8 px-2 rounded-lg text-xs border border-neutral-200 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="text-xs text-neutral-400">–</span>
                  <input
                    type="date"
                    value={lotCreatedTo}
                    min={lotCreatedFrom || undefined}
                    onChange={e => setLotCreatedTo(e.target.value)}
                    className="h-8 px-2 rounded-lg text-xs border border-neutral-200 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Expiration date range */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500">Vencimiento entre</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={lotExpirationFrom}
                    onChange={e => setLotExpirationFrom(e.target.value)}
                    className="h-8 px-2 rounded-lg text-xs border border-neutral-200 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="text-xs text-neutral-400">–</span>
                  <input
                    type="date"
                    value={lotExpirationTo}
                    min={lotExpirationFrom || undefined}
                    onChange={e => setLotExpirationTo(e.target.value)}
                    className="h-8 px-2 rounded-lg text-xs border border-neutral-200 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Clear filters */}
              {activeLotFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearLotFilters}
                  className="h-8 flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 border border-transparent transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  Limpiar
                </button>
              )}
            </div>
          )}
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
        ) : productTypes.length === 0 ? (
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
          <>
            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-xl text-sm">
                <span className="font-medium text-primary-700">
                  {selectedIds.size} {selectedIds.size === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-primary-500 hover:text-primary-700 text-xs underline"
                >
                  Deseleccionar
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="text-danger-600 border-danger-300 hover:bg-danger-50 gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar {selectedIds.size} {selectedIds.size === 1 ? 'producto' : 'productos'}
                  </Button>
                </div>
              </div>
            )}

          <ProductTypeAccordion
            productTypes={productTypes}
            lotSearch={lotSearch || undefined}
            warehouseFilter={warehouseFilter || undefined}
            lotCreatedFrom={lotCreatedFrom || undefined}
            lotCreatedTo={lotCreatedTo || undefined}
            lotExpirationFrom={lotExpirationFrom || undefined}
            lotExpirationTo={lotExpirationTo || undefined}
            canSeePrices={canSeePrices}
            selectedIds={selectedIds}
            onSelectOne={handleSelectOne}
            onSelectAll={handleSelectAll}
            onEditType={openEditType}
            onDeleteType={openDeleteType}
            onAddLot={openAddLot}
            onEditLot={openEditLot}
            onDeleteLot={openDeleteLot}
          />

          {/* Infinite Scroll target */}
          <div ref={observerTarget} className="flex justify-center p-4 min-h-[40px]">
            {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />}
          </div>
          </>
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
                lot_number: deleteLotState.lot.lot_number || '---',
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

      {/* Bulk Delete Confirm */}
      <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} size="sm">
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>Eliminar {selectedIds.size} productos</ModalTitle>
            <ModalDescription>
              Esta acción eliminará permanentemente los {selectedIds.size} productos seleccionados junto con todos sus lotes y stock. No se puede deshacer.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteConfirm(false)}
              disabled={isBulkDeleting}
              className="w-full sm:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              loading={isBulkDeleting}
              className="w-full sm:w-auto"
            >
              Eliminar todos
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

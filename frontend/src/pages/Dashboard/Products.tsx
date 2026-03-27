import React, { useCallback, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Upload, AlertTriangle, Package, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
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
  const [typePanelState, setTypePanelState] = useState<TypePanelState>({ isOpen: false });
  const [lotPanelState, setLotPanelState] = useState<LotPanelState>({ isOpen: false });
  const [deleteTypeState, setDeleteTypeState] = useState<DeleteTypeState>({ show: false });
  const [deleteLotState, setDeleteLotState] = useState<DeleteLotState>({ show: false });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { data: productTypes, isLoading, error } = useProductTypes();
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

  const types = productTypes ?? [];

  return (
    <>
      <Helmet>
        <title>Tipos de Producto - Dashboard</title>
      </Helmet>

      <div className="p-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
              <Package className="h-6 w-6 text-primary-600" />
              Tipos de Producto
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Catalogo de SKUs con sus lotes de produccion
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar CSV
            </Button>
            <Button onClick={openCreateType} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Tipo
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Cargando tipos de producto...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            Error al cargar los tipos de producto. Intenta recargar la pagina.
          </div>
        ) : types.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
              <Package className="h-8 w-8 text-neutral-400" />
            </div>
            <div>
              <p className="text-neutral-700 font-medium">No hay tipos de producto</p>
              <p className="text-neutral-500 text-sm mt-1">
                Crea tu primer tipo de producto o importa desde un CSV.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </Button>
              <Button onClick={openCreateType}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Tipo
              </Button>
            </div>
          </div>
        ) : (
          <ProductTypeAccordion
            productTypes={types}
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

      {/* Delete Type Confirm */}
      <Modal isOpen={deleteTypeState.show} onClose={closeDeleteType} size="sm">
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>Eliminar tipo de producto</ModalTitle>
            <ModalDescription>
              {deleteTypeState.productType && (
                <>
                  Estas por eliminar{' '}
                  <strong>{deleteTypeState.productType.name}</strong> (
                  {deleteTypeState.productType.sku}). Esta accion eliminara tambien todos sus
                  lotes. No se puede deshacer.
                </>
              )}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteType}
              disabled={deleteProductType.isPending}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteType}
              loading={deleteProductType.isPending}
              className="w-full sm:w-auto"
            >
              Eliminar
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
            <ModalTitle>Eliminar lote</ModalTitle>
            <ModalDescription>
              {deleteLotState.lot && (
                <>
                  Estas por eliminar el lote{' '}
                  <strong>{deleteLotState.lot.lot_number}</strong>. Esta accion no se puede
                  deshacer.
                </>
              )}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteLot}
              disabled={deleteProductLot.isPending}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteLot}
              loading={deleteProductLot.isPending}
              className="w-full sm:w-auto"
            >
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastContainer />
    </>
  );
};

export default ProductsPage;

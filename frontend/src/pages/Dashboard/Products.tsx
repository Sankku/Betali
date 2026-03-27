import React, { useCallback, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Eye, Edit, Trash, Upload, Warehouse } from 'lucide-react';
import { useProductStockByWarehouse } from '../../hooks/useProducts';
import { CRUDPage } from '../../components/templates/crud-page';
import { TableWithBulkActions, BulkAction } from '../../components/ui/table-with-bulk-actions';
import { ProductModal, Product, ProductFormData } from '../../components/features/products';
import { ProductImportModal } from '../../components/features/products/product-import-modal';
import { Button } from '../../components/ui/button';
import { ToastContainer } from '../../components/ui/toast';
import {
  useProductManagement,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../../hooks/useProducts';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '../../components/ui';
import { useOrganization } from '../../context/OrganizationContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { usePlanResourceLimit } from '../../hooks/useSubscriptionPlans';

// ── Stock badge with per-warehouse popover ────────────────────────────────────
function StockBadge({ product }: { product: Product & { current_stock?: number; unit?: string } }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const stock = (product as any).current_stock ?? 0;
  const { data } = useProductStockByWarehouse(open ? product.product_id : undefined);

  const stockClass = stock > 10
    ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
    : stock > 0
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
      : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';

  const multiWarehouse = data && data.warehouses.length > 1;

  const show = () => {
    clearTimeout(closeTimer.current);
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  };

  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-default select-none transition-colors ${stockClass}`}
      >
        {stock > 0 ? stock : 'Sin stock'}
        {multiWarehouse && (
          <span className="opacity-60 font-normal">· {data!.warehouses.length} dep.</span>
        )}
      </button>

      {open && createPortal(
        <div
          className="fixed z-[9999] bg-white border border-neutral-200 rounded-lg shadow-xl p-3 min-w-[260px]"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <p className="text-xs font-semibold text-neutral-700 mb-2 flex items-center gap-1.5">
            <Warehouse className="h-3.5 w-3.5" />
            Stock por depósito
          </p>
          {!data ? (
            <p className="text-xs text-neutral-400">Cargando…</p>
          ) : data.warehouses.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">Sin movimientos registrados.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left pb-1 text-neutral-500 font-medium">Depósito</th>
                  <th className="text-right pb-1 text-neutral-500 font-medium">Disponible</th>
                </tr>
              </thead>
              <tbody>
                {data.warehouses.map(row => (
                  <tr key={row.warehouse_id}>
                    <td className="py-1 pr-3 text-neutral-800">{row.warehouse_name}</td>
                    <td className="py-1 text-right font-mono font-semibold text-neutral-900">
                      {row.available_stock}
                      <span className="text-neutral-400 font-normal ml-0.5">{(product as any).unit || 'u'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-200">
                  <td className="pt-1 text-neutral-600 font-semibold">Total</td>
                  <td className="pt-1 text-right font-mono font-bold text-neutral-900">
                    {data.total_available}
                    <span className="text-neutral-400 font-normal ml-0.5">{(product as any).unit || 'u'}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  product?: Product;
}

interface DeleteConfirmState {
  show: boolean;
  products: Product[];
}

const ProductsPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { t } = useTranslation();

  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    products: [],
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { products, isLoading, error } = useProductManagement();
  const { atLimit: atProductLimit, limit: productLimit } = usePlanResourceLimit('max_products', products?.length ?? 0);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const openModal = (mode: ModalState['mode'], product?: Product) => {
    setModal({ isOpen: true, mode, product });
  };

  const closeModal = () => {
    setModal({ isOpen: false, mode: 'create', product: undefined });
  };

  const handleCreateClick = () => openModal('create');

  const handleDelete = async (products: Product[]) => {
    setShowDeleteConfirm({ show: true, products });
  };

  const confirmDelete = async () => {
    try {
      const promises = showDeleteConfirm.products.map(product =>
        deleteProduct.mutateAsync(product.product_id)
      );
      await Promise.all(promises);
      setShowDeleteConfirm({ show: false, products: [] });
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const closeDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm({ show: false, products: [] });
  }, []);

  const handleSubmit = async (data: ProductFormData) => {
    try {
      if (modal.mode === 'create') {
        const result = await createProduct.mutateAsync(data);
        if (data.product_type === 'finished_good') {
          openModal('edit', result as Product);
          return result as Product;
        }
        return result as Product;
      } else if (modal.mode === 'edit' && modal.product?.product_id) {
        await updateProduct.mutateAsync({
          id: modal.product.product_id,
          data: data,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error saving:', error);
      throw error;
    }
  };

  const isLoaderVisible =
    createProduct.isPending || updateProduct.isPending || deleteProduct.isPending;

  // Define bulk actions
  const bulkActions: BulkAction<Product>[] = useMemo(() => [
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
      onClick: (products) => handleDelete(products),
      alwaysShow: true,
    },
  ], [t]);

  // Columns configuration
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('products.fields.name'),
      cell: ({ row }: { row: any }) => (
        <div className="font-medium text-gray-900">
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: 'batch_number',
      header: t('products.fields.sku'),
      cell: ({ row }: { row: any }) => (
        <div className="text-sm text-gray-600 font-mono">
          {row.original.batch_number || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'product_type',
      header: 'Tipo',
      cell: ({ row }: { row: any }) => {
        const type = row.original.product_type || 'standard';
        const styles: Record<string, string> = {
          standard:      'bg-neutral-100 text-neutral-700 border-neutral-300',
          raw_material:  'bg-blue-100 text-blue-700 border-blue-300',
          finished_good: 'bg-purple-100 text-purple-700 border-purple-300',
        };
        const labels: Record<string, string> = {
          standard:      'Estándar',
          raw_material:  'Mat. Prima',
          finished_good: 'Terminado',
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[type] || styles.standard}`}>
            {labels[type] || type}
          </span>
        );
      },
    },
    {
      accessorKey: 'unit',
      header: 'UOM',
      cell: ({ row }: { row: any }) => {
        const unit = row.original.unit || '—';
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            {unit}
          </span>
        );
      },
    },
    {
      accessorKey: 'price',
      header: t('products.fields.price'),
      cell: ({ row }: { row: any }) => (
        <div className="text-sm font-semibold text-green-600">
          ${row.original.price ? row.original.price.toFixed(2) : '0.00'}
        </div>
      ),
    },
    {
      accessorKey: 'current_stock',
      header: t('products.fields.stock'),
      cell: ({ row }: { row: any }) => <StockBadge product={row.original} />,
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }: { row: any }) => {
        const product = row.original as Product;
        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openModal('view', product)}
              className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openModal('edit', product)}
              className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], [t]);


  return (
    <>
      <Helmet>
        <title>{t('products.title')} - Dashboard</title>
      </Helmet>

      <CRUDPage
        title={t('products.title')}
        description={t('products.title')}
        data={products}
        isLoading={isLoading}
        error={error}
        onCreateClick={handleCreateClick}
        isAnyMutationLoading={isLoaderVisible}

        customTable={
          <TableWithBulkActions
            data={products || []}
            columns={columns}
            loading={isLoading || isLoaderVisible}
            getRowId={(product: Product) => product.product_id}
            bulkActions={bulkActions}
            createButtonLabel={t('products.add')}
            createButtonId="create-product-button"
            onCreateClick={handleCreateClick}
            createButtonDisabled={atProductLimit}
            createButtonTooltip={atProductLimit ? `You've reached the product limit (${productLimit}) for your plan. Upgrade to add more.` : undefined}
            customToolbarRight={() => (
              <Button
                variant="outline"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <Upload className="h-4 w-4" />
                Importar CSV
              </Button>
            )}
            onRowDoubleClick={(product) => openModal('edit', product)}
            searchable={true}
            enablePagination={true}
            pageSize={25}
            emptyMessage={
              !currentOrganization
                ? t('products.title')
                : t('products.title')
            }
          />
        }
      />

      <ProductModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        mode={modal.mode}
        product={modal.product}
        onSubmit={handleSubmit}
        isLoading={createProduct.isPending || updateProduct.isPending}
      />

      <ProductImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <Modal isOpen={showDeleteConfirm.show} onClose={closeDeleteConfirm} size="sm">
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>
              {t('confirmations.deleteTitle')}
            </ModalTitle>
            <ModalDescription>
              {showDeleteConfirm.products.length === 1
                ? t('products.deleteConfirmSingle')
                : t('products.deleteConfirm', { count: showDeleteConfirm.products.length.toString() })
              }
            </ModalDescription>
          </ModalHeader>

          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteConfirm}
              disabled={deleteProduct.isPending}
              className="w-full sm:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteProduct.isPending}
              className="w-full sm:w-auto"
            >
              {t('common.delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <ToastContainer />
    </>
  );
};

export default ProductsPage;

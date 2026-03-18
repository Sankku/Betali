import React, { useCallback, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Eye, Edit, Trash } from 'lucide-react';
import { CRUDPage } from '../../components/templates/crud-page';
import { TableWithBulkActions, BulkAction } from '../../components/ui/table-with-bulk-actions';
import { ProductModal, Product, ProductFormData } from '../../components/features/products';
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
        await createProduct.mutateAsync(data);
      } else if (modal.mode === 'edit' && modal.product?.product_id) {
        await updateProduct.mutateAsync({
          id: modal.product.product_id,
          data: data,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error saving:', error);
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
      accessorKey: 'price',
      header: t('products.fields.price'),
      cell: ({ row }: { row: any }) => (
        <div className="text-sm text-gray-900 font-medium">
          ${row.original.price ? row.original.price.toFixed(2) : 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'current_stock',
      header: t('products.fields.stock'),
      cell: ({ row }: { row: any }) => {
        const stock = row.original.current_stock ?? 0;
        const stockClass = stock > 10
          ? 'bg-green-100 text-green-800 border-green-200'
          : stock > 0
          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
          : 'bg-red-100 text-red-800 border-red-200';

        return (
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${stockClass}`}>
            {stock > 0 ? stock : 'Out of stock'}
          </div>
        );
      },
    },
    {
      accessorKey: 'origin_country',
      header: 'Origin',
      cell: ({ row }: { row: any }) => (
        <div className="text-sm text-gray-600">
          {row.original.origin_country || 'N/A'}
        </div>
      ),
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
            onRowDoubleClick={(product) => openModal('edit', product)}
            searchable={true}
            enablePagination={true}
            pageSize={10}
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

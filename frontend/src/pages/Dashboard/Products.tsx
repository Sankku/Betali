import React, { useCallback, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Eye, Edit, Trash } from 'lucide-react';
import { CRUDPage } from '../../components/templates/crud-page';
import { BackendConfiguredTable } from '../../components/table/BackendConfiguredTable';
import { DataTable } from '../../components/ui/data-table';
import { useTableConfig } from '../../hooks/useTableConfig';
import { TableConfig } from '../../types/table';
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

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  product?: Product;
}

interface DeleteConfirmState {
  show: boolean;
  product?: Product;
}

// Type guard to safely check tableConfig
const isValidTableConfig = (config: any): config is TableConfig => {
  return config && 
    typeof config === 'object' && 
    typeof config.name === 'string' &&
    Array.isArray(config.columns);
};

const ProductsPage: React.FC = () => {
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
  } = useTableConfig('products');
  const { products, isLoading, error } = useProductManagement();
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

  const handleDelete = async (product: Product) => {
    if (!product?.product_id) {
      console.error('Product ID is missing:', product);
      return;
    }
    setShowDeleteConfirm({ show: true, product });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.product?.product_id) {
      try {
        await deleteProduct.mutateAsync(showDeleteConfirm.product.product_id);
        setShowDeleteConfirm({ show: false });
      } catch (error) {
        console.error('Error deleting:', error);
      }
    } else {
      console.error('Cannot delete: Product ID is missing');
    }
  };

  const closeDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm({ show: false });
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

  // Handle table actions from the configurable table
  const handleTableAction = useCallback((action: string, row: Product) => {
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
    createProduct.isPending || updateProduct.isPending || deleteProduct.isPending;

  // Fallback columns for DataTable when backend config is not available
  const fallbackColumns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Product Name',
      cell: ({ row }: { row: any }) => (
        <div className="font-medium text-gray-900">
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }: { row: any }) => (
        <div className="text-sm text-gray-600 font-mono">
          {row.original.sku || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }: { row: any }) => (
        <div className="text-sm text-gray-900 font-medium">
          ${row.original.price ? row.original.price.toFixed(2) : 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'batch_number',
      header: 'Batch',
      cell: ({ row }: { row: any }) => (
        <div className="text-sm text-gray-600">
          {row.original.batch_number || 'N/A'}
        </div>
      ),
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
      header: 'Actions',
      cell: ({ row }: { row: any }) => {
        const product = row.original as Product;
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openModal('view', product)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openModal('edit', product)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(product)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], []);

  return (
    <>
      <Helmet>
        <title>Products - Dashboard</title>
      </Helmet>

      <CRUDPage
        title={isValidTableConfig(tableConfig) ? tableConfig.name : 'Product Management'}
        description={
          configLoading
            ? 'Loading table configuration...'
            : 'Manage product inventory and information'
        }
        data={products}
        isLoading={isLoading || isLoaderVisible || configLoading}
        error={error || configError}
        onCreateClick={handleCreateClick}
        customTable={
          isValidTableConfig(tableConfig) ? (
            <BackendConfiguredTable
              config={tableConfig}
              data={products}
              onAction={handleTableAction}
              isLoading={isLoading || isLoaderVisible}
            />
          ) : (
            // Fallback to DataTable if backend configuration is not available
            <div className="space-y-4">
              {(configError || (!configLoading && !tableConfig)) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        {configError ? 
                          `Backend table configuration unavailable: ${configError.message || configError}` : 
                          'Using default table configuration.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <DataTable
                columns={fallbackColumns}
                data={products || []}
                loading={isLoading || isLoaderVisible}
                searchable={true}
                enablePagination={true}
                pageSize={10}
                emptyMessage="No products found. Create your first product to get started."
              />
            </div>
          )
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
            <ModalTitle>Delete product?</ModalTitle>
            <ModalDescription>
              This action cannot be undone. The product{' '}
              <span className="font-medium text-neutral-900">
                "{showDeleteConfirm.product?.name || 'selected'}"
              </span>{' '}
              will be permanently deleted.
            </ModalDescription>
          </ModalHeader>

          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteConfirm}
              disabled={deleteProduct.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteProduct.isPending}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <ToastContainer />
    </>
  );
};

export default ProductsPage;

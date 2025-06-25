import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Package, Calendar, Globe, AlertTriangle, AlertCircle } from 'lucide-react';
import { CRUDPage } from '../../components/templates/crud-page';
import {
  createEntityTableColumns,
  commonEntityActions,
  EntityTableAction,
} from '../../components/templates/entity-table';
import { ProductModal, Product, ProductFormData } from '../../components/features/products';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ToastContainer } from '../../components/ui/toast';
import {
  useProductManagement,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../../hooks/useProducts';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  product?: Product;
}

interface DeleteConfirmState {
  show: boolean;
  product?: Product;
}

const ProductsPage: React.FC = () => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
  });

  const { products, isLoading, error, isAnyMutationLoading } = useProductManagement();
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
    setShowDeleteConfirm({ show: true, product });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.product) {
      try {
        await deleteProduct.mutateAsync(showDeleteConfirm.product.id);
        setShowDeleteConfirm({ show: false });
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const handleSubmit = async (data: ProductFormData) => {
    try {
      if (modal.mode === 'create') {
        await createProduct.mutateAsync(data);
      } else if (modal.mode === 'edit' && modal.product) {
        await updateProduct.mutateAsync({
          id: modal.product.id,
          ...data,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const isNearExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const tableColumns = [
    {
      accessorKey: 'name' as keyof Product,
      header: 'Producto',
      cell: (value: any, product: Product) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Package className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <div className="font-medium text-neutral-900">{value}</div>
            <div className="text-sm text-neutral-500">Lote: {product.batch_number}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'expiry_date' as keyof Product,
      header: 'Vencimiento',
      cell: (value: any) => {
        const expired = isExpired(value);
        const nearExpiry = isNearExpiry(value);

        return (
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <div>
              <div
                className={`text-sm font-medium ${
                  expired ? 'text-red-600' : nearExpiry ? 'text-yellow-600' : 'text-neutral-900'
                }`}
              >
                {new Date(value).toLocaleDateString('es-ES')}
              </div>
              {(expired || nearExpiry) && (
                <Badge variant={expired ? 'danger' : 'warning'} size="sm">
                  {expired ? 'Vencido' : 'Por vencer'}
                </Badge>
              )}
            </div>
            {(expired || nearExpiry) && (
              <AlertCircle className={`w-4 h-4 ${expired ? 'text-red-500' : 'text-yellow-500'}`} />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'country_of_origin' as keyof Product,
      header: 'Origen',
      cell: (value: any) => (
        <div className="flex items-center text-neutral-600">
          <Globe className="w-4 h-4 mr-2" />
          {value}
        </div>
      ),
    },
    {
      accessorKey: 'created_at' as keyof Product,
      header: 'Fecha Registro',
      cell: (value: any) => (
        <div className="text-sm text-neutral-600">
          {new Date(value).toLocaleDateString('es-ES')}
        </div>
      ),
    },
  ];

  const tableActions: EntityTableAction<Product>[] = [
    commonEntityActions.view(product => openModal('view', product)),
    commonEntityActions.edit(product => openModal('edit', product)),
    commonEntityActions.delete(handleDelete),
  ];

  const columns = createEntityTableColumns(tableColumns, tableActions);

  return (
    <>
      <Helmet>
        <title>Productos - Dashboard</title>
      </Helmet>

      <CRUDPage
        title="Gestión de Productos"
        description="Administre el inventario de productos y su información"
        data={products}
        isLoading={isLoading}
        error={error}
        columns={columns}
        onCreateClick={handleCreateClick}
        onRowClick={product => openModal('view', product)}
        isAnyMutationLoading={isAnyMutationLoading}
      />

      <ProductModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        mode={modal.mode}
        product={modal.product}
        onSubmit={handleSubmit}
        isLoading={createProduct.isPending || updateProduct.isPending}
      />

      {showDeleteConfirm.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl border border-neutral-200 max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>

              <h3 className="text-lg font-medium text-center mb-2">¿Eliminar producto?</h3>

              <p className="text-sm text-neutral-600 text-center mb-6">
                Esta acción no se puede deshacer. El producto{' '}
                <strong>{showDeleteConfirm.product?.name}</strong> será eliminado permanentemente.
              </p>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm({ show: false })}
                  className="flex-1"
                  disabled={deleteProduct.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  className="flex-1"
                  loading={deleteProduct.isPending}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </>
  );
};

export default ProductsPage;

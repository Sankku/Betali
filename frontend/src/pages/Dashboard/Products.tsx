// src/pages/Dashboard/Products.tsx
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Package,
  Calendar,
  Globe,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Dashboard';
import { DataTable } from '../../components/ui/data-table';
import { Button } from '../../components/ui/button';
import { ToastContainer } from '../../components/ui/toast';
import { Database } from '../../types/database';
import { ProductModal } from '../../components/modules/products/productsModal';
import { useProductManagement, useDeleteProduct, useUpdateProduct } from '../../hooks/useProducts';

type Product = Database['public']['Tables']['products']['Row'];

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  product?: Product;
}

const ProductsPage: React.FC = () => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    show: boolean;
    product?: Product;
  }>({ show: false });

  const { products, isLoading, error, isAnyMutationLoading } = useProductManagement();

  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();

  const openModal = (mode: ModalState['mode'], product?: Product) => {
    setModal({
      isOpen: true,
      mode,
      product,
    });
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      mode: 'create',
      product: undefined,
    });
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  const handleDelete = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm({ show: true, product });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.product) {
      try {
        await deleteProduct.mutateAsync(showDeleteConfirm.product.product_id);
        setShowDeleteConfirm({ show: false });
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  // Función para determinar el estado del producto basado en la fecha de vencimiento
  const getProductStatus = (expirationDate: string) => {
    const now = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (daysUntilExpiration < 0) {
      return { status: 'expired', className: 'text-red-600', bgClassName: 'bg-red-100' };
    } else if (daysUntilExpiration <= 30) {
      return {
        status: 'expiring_soon',
        className: 'text-yellow-600',
        bgClassName: 'bg-yellow-100',
      };
    } else if (daysUntilExpiration <= 90) {
      return { status: 'warning', className: 'text-orange-600', bgClassName: 'bg-orange-100' };
    } else {
      return { status: 'good', className: 'text-green-600', bgClassName: 'bg-green-100' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'expired':
        return 'Vencido';
      case 'expiring_soon':
        return 'Por vencer';
      case 'warning':
        return 'Atención';
      case 'good':
        return 'Vigente';
      default:
        return 'Desconocido';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'expired':
        return <AlertTriangle className="w-3 h-3" />;
      case 'expiring_soon':
        return <Calendar className="w-3 h-3" />;
      case 'warning':
        return <Calendar className="w-3 h-3" />;
      case 'good':
        return <Package className="w-3 h-3" />;
      default:
        return <Package className="w-3 h-3" />;
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                <Package className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-900">{product.name}</div>
              {product.description && (
                <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'batch_number',
      header: 'Lote',
      cell: ({ row }) => {
        const batchNumber = row.getValue('batch_number') as string;
        return (
          <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {batchNumber}
          </span>
        );
      },
    },
    {
      accessorKey: 'origin_country',
      header: 'País de Origen',
      cell: ({ row }) => {
        const country = row.getValue('origin_country') as string;
        return (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{country}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'expiration_date',
      header: 'Vencimiento',
      cell: ({ row }) => {
        const expirationDate = row.getValue('expiration_date') as string;
        const productStatus = getProductStatus(expirationDate);
        const formattedDate = new Date(expirationDate).toLocaleDateString('es-ES');

        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-900">{formattedDate}</span>
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${productStatus.bgClassName} ${productStatus.className}`}
            >
              {getStatusIcon(productStatus.status)}
              {getStatusLabel(productStatus.status)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Fecha de Registro',
      cell: ({ row }) => {
        const createdAt = row.getValue('created_at') as string;
        const date = new Date(createdAt);
        return (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            {date.toLocaleDateString('es-ES')}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={e => handleActionClick(e, () => openModal('view', product))}
              className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
              title="Ver detalles"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={e => handleActionClick(e, () => openModal('edit', product))}
              className="p-1 text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50 rounded transition-colors"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={e => handleDelete(e, product)}
              className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
              title="Eliminar"
              disabled={deleteProduct.isPending}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  // Estadísticas de productos
  const productStats = React.useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return { total: 0, expired: 0, expiring: 0, good: 0 };
    }

    return products.reduce(
      (acc, product) => {
        const { status } = getProductStatus(product.expiration_date);
        acc.total++;

        switch (status) {
          case 'expired':
            acc.expired++;
            break;
          case 'expiring_soon':
          case 'warning':
            acc.expiring++;
            break;
          default:
            acc.good++;
        }

        return acc;
      },
      { total: 0, expired: 0, expiring: 0, good: 0 }
    );
  }, [products]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error al cargar productos</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Hubo un problema al cargar los productos. Por favor, intenta nuevamente.</p>
                </div>
                <div className="mt-4">
                  <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                    Reintentar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Productos - Dashboard</title>
        <meta name="description" content="Gestión de productos" />
      </Helmet>

      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                      <Package className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Gestiona tu inventario de productos
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-0">
                <Button onClick={() => openModal('create')} disabled={isAnyMutationLoading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Producto
                </Button>
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Productos
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">{productStats.total}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Vigentes</dt>
                      <dd className="text-lg font-medium text-green-600">{productStats.good}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Por Vencer</dt>
                      <dd className="text-lg font-medium text-yellow-600">
                        {productStats.expiring}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Vencidos</dt>
                      <dd className="text-lg font-medium text-red-600">{productStats.expired}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de productos */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <DataTable
              data={Array.isArray(products) ? products : []}
              columns={columns}
              loading={isLoading}
              searchable={true}
              searchPlaceholder="Buscar productos..."
              emptyMessage="No hay productos registrados"
              pageSize={10}
              enableSorting={true}
              enablePagination={true}
            />
          </div>
        </div>

        {/* Modal de producto */}
        {modal.isOpen && (
          <ProductModal
            isOpen={modal.isOpen}
            onClose={closeModal}
            mode={modal.mode}
            product={modal.product}
          />
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteConfirm.show && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h3 className="ml-2 text-lg font-medium text-gray-900">Confirmar eliminación</h3>
              </div>
              <div className="mt-3">
                <p className="text-sm text-gray-500">
                  ¿Estás seguro de que deseas eliminar el producto "
                  {showDeleteConfirm.product?.name}"? Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="mt-5 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowDeleteConfirm({ show: false })}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteProduct.isPending}
                >
                  {deleteProduct.isPending ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
      </DashboardLayout>
    </>
  );
};

export default ProductsPage;

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Eye, Edit, Trash2, Plus } from "lucide-react";
import { DataTable } from "../../common/Table";
import { Modal, ModalFooter } from "../../common/Modals";
import { Button } from "../../ui/button";
import { Alert } from "../../ui/alert";
import { ProductForm } from "./ProductForm";
import { Database } from "../../../types/database";
import { productsService } from "../../../services/api/productsService";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function ProductList() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit" | "view" | "delete";
  }>({
    isOpen: false,
    mode: "create",
  });

  const {
    data: products,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsService.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => productsService.delete(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeModal();
    },
  });

  const openCreateModal = () => {
    setSelectedProduct(undefined);
    setModalState({ isOpen: true, mode: "create" });
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setModalState({ isOpen: true, mode: "edit" });
  };

  const openViewModal = (product: Product) => {
    setSelectedProduct(product);
    setModalState({ isOpen: true, mode: "view" });
  };

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product);
    setModalState({ isOpen: true, mode: "delete" });
  };

  const closeModal = () => {
    setModalState({ ...modalState, isOpen: false });
  };

  const confirmDelete = () => {
    if (selectedProduct?.product_id) {
      deleteMutation.mutate(selectedProduct.product_id);
    }
  };

  const columnHelper = createColumnHelper<Product>();
  const columns = [
    columnHelper.accessor("name", {
      header: "Nombre",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("batch_number", {
      header: "Número de Lote",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("origin_country", {
      header: "País de Origen",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("expiration_date", {
      header: "Fecha de Vencimiento",
      cell: (info) => {
        const date = new Date(info.getValue());
        return date.toLocaleDateString();
      },
    }),
    columnHelper.accessor("product_id", {
      header: "Acciones",
      cell: (info) => {
        const product = info.row.original;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => openViewModal(product)}
              className="text-blue-600 hover:text-blue-900"
              aria-label="Ver detalles"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button
              onClick={() => openEditModal(product)}
              className="text-yellow-600 hover:text-yellow-900"
              aria-label="Editar"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={() => openDeleteModal(product)}
              className="text-red-600 hover:text-red-900"
              aria-label="Eliminar"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        );
      },
    }),
  ];

  if (error) {
    return (
      <Alert variant="destructive" title="Error al cargar productos">
        <p>
          Ocurrió un error al cargar los productos. Por favor, intenta de nuevo.
        </p>
        <div className="mt-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Reintentar
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Productos
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona tu inventario de productos
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={openCreateModal}>
            <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <DataTable
        data={products || []}
        columns={columns}
        isLoading={isLoading}
        refetch={refetch}
        searchPlaceholder="Buscar productos..."
        noResultsMessage="No se encontraron productos"
      />
      {modalState.isOpen && modalState.mode !== "delete" && (
        <Modal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={
            modalState.mode === "create"
              ? "Crear Nuevo Producto"
              : modalState.mode === "edit"
              ? "Editar Producto"
              : "Detalles del Producto"
          }
          maxWidth="2xl"
        >
          <ProductForm
            product={selectedProduct}
            mode={modalState.mode}
            onSuccess={closeModal}
            onCancel={closeModal}
          />
        </Modal>
      )}
      {modalState.isOpen && modalState.mode === "delete" && selectedProduct && (
        <Modal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title="Confirmar Eliminación"
          maxWidth="sm"
          footer={
            <ModalFooter
              onClose={closeModal}
              onConfirm={confirmDelete}
              confirmText="Eliminar"
              variant="danger"
              isLoading={deleteMutation.isPending}
            />
          }
        >
          <div className="text-center sm:text-left">
            <p className="text-sm text-gray-500">
              ¿Estás seguro que deseas eliminar el producto
              <span className="font-medium text-gray-900">
                {selectedProduct.name}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            {deleteMutation.error && (
              <Alert variant="destructive" className="mt-4">
                <p className="text-sm">
                  {(deleteMutation.error as Error).message ||
                    "Ocurrió un error al eliminar el producto"}
                </p>
              </Alert>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { productsService } from "../../services/productsService";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
} from "lucide-react";
import { Database } from "../../types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];

const columnHelper = createColumnHelper<Product>();

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  mode: "create" | "edit" | "view";
}

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  mode,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      name: "",
      batch_number: "",
      origin_country: "",
      expiration_date: "",
      description: "",
    }
  );

  const createProductMutation = useMutation({
    mutationFn: async (newProduct: Partial<Product>) => {
      return await productsService.create(newProduct);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (updatedProduct: Partial<Product>) => {
      if (!product?.product_id) throw new Error("ID de producto no disponible");
      return await productsService.update(product.product_id, updatedProduct);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
      createProductMutation.mutate(formData);
    } else if (mode === "edit") {
      updateProductMutation.mutate(formData);
    }
  };

  if (!isOpen) return null;

  const isViewOnly = mode === "view";
  const title =
    mode === "create"
      ? "Crear Nuevo Producto"
      : mode === "edit"
      ? "Editar Producto"
      : "Detalles del Producto";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-25"
          onClick={onClose}
        ></div>

        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-auto">
          <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
            >
              <X className="w-5 h-5" />
              <span className="sr-only">Cerrar</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-4 md:p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nombre del Producto
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleChange}
                    disabled={isViewOnly}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="batch_number"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Número de Lote
                  </label>
                  <input
                    type="text"
                    id="batch_number"
                    name="batch_number"
                    value={formData.batch_number || ""}
                    onChange={handleChange}
                    disabled={isViewOnly}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="origin_country"
                    className="block text-sm font-medium text-gray-700"
                  >
                    País de Origen
                  </label>
                  <input
                    type="text"
                    id="origin_country"
                    name="origin_country"
                    value={formData.origin_country || ""}
                    onChange={handleChange}
                    disabled={isViewOnly}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="expiration_date"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    id="expiration_date"
                    name="expiration_date"
                    value={formData.expiration_date?.slice(0, 10) || ""}
                    onChange={handleChange}
                    disabled={isViewOnly}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Descripción
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description || ""}
                    onChange={handleChange}
                    disabled={isViewOnly}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end p-4 md:p-5 border-t border-gray-200 rounded-b">
              <button
                type="button"
                onClick={onClose}
                className="mr-3 text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-md border border-gray-200 text-sm font-medium px-5 py-2.5"
              >
                Cancelar
              </button>

              {!isViewOnly && (
                <button
                  type="submit"
                  className="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-md text-sm px-5 py-2.5"
                  disabled={
                    createProductMutation.isPending ||
                    updateProductMutation.isPending
                  }
                >
                  {createProductMutation.isPending ||
                  updateProductMutation.isPending
                    ? "Guardando..."
                    : mode === "create"
                    ? "Crear Producto"
                    : "Actualizar Producto"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Products: React.FC = () => {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [modal, setModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit" | "view";
    product?: Product;
  }>({
    isOpen: false,
    mode: "create",
  });

  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      return await productsService.getAll();
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await productsService.delete(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleDelete = (productId: string) => {
    if (window.confirm("¿Estás seguro que deseas eliminar este producto?")) {
      deleteProductMutation.mutate(productId);
    }
  };

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
              onClick={() => setModal({ isOpen: true, mode: "view", product })}
              className="text-blue-600 hover:text-blue-900"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button
              onClick={() => setModal({ isOpen: true, mode: "edit", product })}
              className="text-yellow-600 hover:text-yellow-900"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDelete(info.getValue())}
              className="text-red-600 hover:text-red-900"
              disabled={deleteProductMutation.isPending}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: products || [],
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Gestión de Productos
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Administra el inventario de productos de tu sistema
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setModal({ isOpen: true, mode: "create" })}
              className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Nuevo Producto
            </button>
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
          <div className="px-4 py-5 sm:p-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4">
              <div className="relative mt-2 sm:mt-0 sm:max-w-xs w-full">
                <label htmlFor="search" className="sr-only">
                  Buscar
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    value={globalFilter || ""}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                    placeholder="Buscar productos..."
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-2 text-sm text-gray-500">
                  Cargando productos...
                </p>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle
                      className="h-5 w-5 text-red-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error al cargar los productos
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        Ocurrió un error al obtener los datos. Por favor,
                        intenta de nuevo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="mt-2 flow-root">
                  <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead>
                          {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                              {headerGroup.headers.map((header) => (
                                <th
                                  key={header.id}
                                  scope="col"
                                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                                >
                                  <div
                                    className={`group inline-flex ${
                                      header.column.getCanSort()
                                        ? "cursor-pointer select-none"
                                        : ""
                                    }`}
                                    onClick={header.column.getToggleSortingHandler()}
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          ))}
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map((row) => (
                              <tr key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                  <td
                                    key={cell.id}
                                    className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-0"
                                  >
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={columns.length}
                                className="py-10 text-center text-sm text-gray-500"
                              >
                                No se encontraron productos
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700">
                      Mostrando{" "}
                      <span className="font-medium">
                        {table.getState().pagination.pageIndex *
                          table.getState().pagination.pageSize +
                          1}
                      </span>{" "}
                      a{" "}
                      <span className="font-medium">
                        {Math.min(
                          (table.getState().pagination.pageIndex + 1) *
                            table.getState().pagination.pageSize,
                          table.getFilteredRowModel().rows.length
                        )}
                      </span>{" "}
                      de{" "}
                      <span className="font-medium">
                        {table.getFilteredRowModel().rows.length}
                      </span>{" "}
                      resultados
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </button>
                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ProductModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, mode: "create" })}
        product={modal.product}
        mode={modal.mode}
      />
    </DashboardLayout>
  );
};

export default Products;

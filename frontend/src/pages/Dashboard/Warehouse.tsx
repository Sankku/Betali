// frontend/src/pages/Dashboard/Warehouses.tsx
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
  Warehouse,
  MapPin,
  Activity,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Package,
} from "lucide-react";
import { Database } from "../../types/database";
import { DashboardLayout } from "../../components/layout/Dashboard";
import { warehouseService } from "../../services/api/warehouseService";

type WarehouseType = Database["public"]["Tables"]["warehouse"]["Row"];

interface WarehouseWithStats extends WarehouseType {
  stats: {
    totalMovements: number;
    recentMovements: Array<{
      movement_id: string;
      movement_date: string;
      movement_type: string;
      quantity: number;
      products?: {
        name: string;
      };
    }>;
  };
}

const columnHelper = createColumnHelper<WarehouseWithStats>();

interface WarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse?: WarehouseWithStats;
  mode: "create" | "edit" | "view";
}

const WarehouseModal: React.FC<WarehouseModalProps> = ({
  isOpen,
  onClose,
  warehouse,
  mode,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<{
    name: string;
    location: string;
    is_active: boolean;
  }>(
    warehouse || {
      name: "",
      location: "",
      is_active: true,
    }
  );

  const createWarehouseMutation = useMutation({
    mutationFn: async (newWarehouse: { name: string; location: string }) => {
      return await warehouseService.create(newWarehouse);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      onClose();
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: async (updatedWarehouse: {
      name: string;
      location: string;
      is_active?: boolean;
    }) => {
      if (!warehouse?.warehouse_id)
        throw new Error("ID de almacén no disponible");
      return await warehouseService.update(
        warehouse.warehouse_id,
        updatedWarehouse
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      onClose();
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
      createWarehouseMutation.mutate({
        name: formData.name,
        location: formData.location,
      });
    } else if (mode === "edit") {
      updateWarehouseMutation.mutate(formData);
    }
  };

  if (!isOpen) return null;

  const isViewOnly = mode === "view";
  const title =
    mode === "create"
      ? "Crear Nuevo Almacén"
      : mode === "edit"
      ? "Editar Almacén"
      : "Detalles del Almacén";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-25"
          onClick={onClose}
        ></div>

        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-auto">
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
            <div className="p-4 md:p-5 space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <Warehouse className="w-4 h-4 inline mr-2" />
                    Nombre del Almacén
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isViewOnly}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500"
                    required
                    placeholder="Ej: Almacén Central"
                  />
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Ubicación
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    disabled={isViewOnly}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500"
                    required
                    placeholder="Ej: Córdoba, Argentina"
                  />
                </div>

                {(mode === "edit" || mode === "view") && (
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        disabled={isViewOnly}
                        className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:opacity-50"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {formData.is_active ? (
                          <ToggleRight className="w-4 h-4 inline mr-1 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 inline mr-1 text-gray-400" />
                        )}
                        Almacén activo
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Estadísticas solo en modo view */}
              {mode === "view" && warehouse && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    <Activity className="w-5 h-5 inline mr-2" />
                    Estadísticas
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Package className="w-8 h-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-blue-600">
                            Total Movimientos
                          </p>
                          <p className="text-2xl font-bold text-blue-900">
                            {warehouse.stats?.totalMovements || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Calendar className="w-8 h-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-green-600">
                            Fecha Creación
                          </p>
                          <p className="text-sm font-bold text-green-900">
                            {warehouse.created_at
                              ? new Date(
                                  warehouse.created_at
                                ).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Activity className="w-8 h-8 text-purple-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-purple-600">
                            Estado
                          </p>
                          <p className="text-sm font-bold text-purple-900">
                            {warehouse.is_active ? "Activo" : "Inactivo"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Movimientos recientes */}
                  {warehouse.stats?.recentMovements &&
                    warehouse.stats.recentMovements.length > 0 && (
                      <div>
                        <h5 className="text-md font-medium text-gray-900 mb-3">
                          Movimientos Recientes
                        </h5>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <ul className="space-y-2">
                            {warehouse.stats.recentMovements
                              .slice(0, 5)
                              .map((movement) => (
                                <li
                                  key={movement.movement_id}
                                  className="flex justify-between items-center text-sm"
                                >
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-900">
                                      {movement.movement_type}
                                    </span>
                                    {movement.products?.name && (
                                      <span className="ml-2 text-gray-600">
                                        - {movement.products.name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="text-gray-500">
                                      {new Date(
                                        movement.movement_date
                                      ).toLocaleDateString()}
                                    </span>
                                    <span className="ml-2 font-medium">
                                      {movement.quantity} unidades
                                    </span>
                                  </div>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end p-4 md:p-5 border-t border-gray-200 rounded-b">
              <button
                type="button"
                onClick={onClose}
                className="mr-3 text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-md border border-gray-200 text-sm font-medium px-5 py-2.5"
              >
                {isViewOnly ? "Cerrar" : "Cancelar"}
              </button>

              {!isViewOnly && (
                <button
                  type="submit"
                  className="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-md text-sm px-5 py-2.5"
                  disabled={
                    createWarehouseMutation.isPending ||
                    updateWarehouseMutation.isPending
                  }
                >
                  {createWarehouseMutation.isPending ||
                  updateWarehouseMutation.isPending
                    ? "Guardando..."
                    : mode === "create"
                    ? "Crear Almacén"
                    : "Actualizar Almacén"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Warehouses: React.FC = () => {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [modal, setModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit" | "view";
    warehouse?: WarehouseWithStats;
  }>({
    isOpen: false,
    mode: "create",
  });

  const {
    data: warehouses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      return await warehouseService.getAll();
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (warehouseId: string) => {
      await warehouseService.deactivate(warehouseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
  });

  const handleDelete = (warehouseId: string) => {
    if (
      window.confirm(
        "¿Estás seguro que deseas desactivar este almacén? Esta acción se puede revertir editando el almacén."
      )
    ) {
      deleteWarehouseMutation.mutate(warehouseId);
    }
  };

  const columns = [
    columnHelper.accessor("name", {
      header: "Nombre",
      cell: (info) => (
        <div className="flex items-center">
          <Warehouse className="h-4 w-4 mr-2 text-gray-400" />
          <span className="font-medium">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor("location", {
      header: "Ubicación",
      cell: (info) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor("is_active", {
      header: "Estado",
      cell: (info) => {
        const isActive = info.getValue();
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isActive ? (
              <>
                <ToggleRight className="w-3 h-3 mr-1" />
                Activo
              </>
            ) : (
              <>
                <ToggleLeft className="w-3 h-3 mr-1" />
                Inactivo
              </>
            )}
          </span>
        );
      },
    }),
    columnHelper.accessor("stats", {
      header: "Movimientos",
      cell: (info) => {
        const stats = info.getValue();
        return (
          <div className="flex items-center">
            <Activity className="h-4 w-4 mr-2 text-gray-400" />
            <span className="font-medium">{stats?.totalMovements || 0}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor("created_at", {
      header: "Fecha Creación",
      cell: (info) => {
        const date = info.getValue();
        return date ? new Date(date).toLocaleDateString() : "N/A";
      },
    }),
    columnHelper.accessor("warehouse_id", {
      header: "Acciones",
      cell: (info) => {
        const warehouse = info.row.original;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() =>
                setModal({ isOpen: true, mode: "view", warehouse })
              }
              className="text-blue-600 hover:text-blue-900"
              title="Ver detalles"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button
              onClick={() =>
                setModal({ isOpen: true, mode: "edit", warehouse })
              }
              className="text-yellow-600 hover:text-yellow-900"
              title="Editar almacén"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDelete(info.getValue())}
              className="text-red-600 hover:text-red-900"
              disabled={deleteWarehouseMutation.isPending}
              title="Desactivar almacén"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: warehouses || [],
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
              Gestión de Almacenes
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Administra los almacenes y depósitos de tu sistema
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setModal({ isOpen: true, mode: "create" })}
              className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Nuevo Almacén
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
                    placeholder="Buscar almacenes..."
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-2 text-sm text-gray-500">
                  Cargando almacenes...
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
                      Error al cargar los almacenes
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
                              <tr key={row.id} className="hover:bg-gray-50">
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
                                <Warehouse className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <p className="text-lg font-medium text-gray-900 mb-2">
                                  No hay almacenes
                                </p>
                                <p>
                                  Comienza creando tu primer almacén para
                                  gestionar tu inventario.
                                </p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Pagination */}
                {table.getPageCount() > 1 && (
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
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <WarehouseModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, mode: "create" })}
        warehouse={modal.warehouse}
        mode={modal.mode}
      />
    </DashboardLayout>
  );
};

export default Warehouses;

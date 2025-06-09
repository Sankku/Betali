import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Eye, Edit, Trash2 } from "lucide-react";
import { Database } from "../types/database";

export type TableRow =
  Database["public"]["Tables"][keyof Database["public"]["Tables"]]["Row"];

export type ActionConfig<T extends TableRow> = {
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  idField?: keyof T;
  disableDelete?: boolean;
  additionalActions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: (item: T) => void;
    className?: string;
  }>;
};

export type ColumnMapping<T extends TableRow> = {
  field: keyof T;
  header: string;
  accessor?: (value: any, row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  hidden?: boolean;
};

export function createColumns<T extends TableRow>(
  columnMappings: ColumnMapping<T>[],
  actionConfig?: ActionConfig<T>,
  moduleConfig?: {
    senasaEnabled?: boolean;
  }
): ColumnDef<T, any>[] {
  const columnHelper = createColumnHelper<T>();

  const filteredMappings = columnMappings.filter((mapping) => {
    if (mapping.hidden) return false;

    const isSenasaField = mapping.field.toString().startsWith("senasa_");
    if (isSenasaField && moduleConfig?.senasaEnabled !== true) {
      return false;
    }

    return true;
  });

  const columns = filteredMappings.map((mapping) => {
    return columnHelper.accessor(mapping.field as any, {
      header: mapping.header,
      cell: (info) => {
        const value = info.getValue();
        const row = info.row.original;
        if (mapping.accessor) {
          return mapping.accessor(value, row);
        }

        if (value === null || value === undefined) {
          return "-";
        }

        if (
          value instanceof Date ||
          (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))
        ) {
          try {
            const date = value instanceof Date ? value : new Date(value);
            return date.toLocaleDateString();
          } catch {
            return value;
          }
        }

        if (typeof value === "boolean") {
          return value ? "Sí" : "No";
        }

        return value;
      },
      meta: {
        className: mapping.className,
      },
      enableSorting: mapping.sortable !== false,
    });
  });

  if (actionConfig) {
    const idField = actionConfig.idField || "id";

    columns.push(
      columnHelper.accessor(idField as any, {
        header: "Acciones",
        enableSorting: false,
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="flex space-x-2">
              {actionConfig.onView && (
                <button
                  onClick={() => actionConfig.onView!(item)}
                  className="text-blue-600 hover:text-blue-900"
                  aria-label="Ver detalles"
                >
                  <Eye className="h-5 w-5" />
                </button>
              )}

              {actionConfig.onEdit && (
                <button
                  onClick={() => actionConfig.onEdit!(item)}
                  className="text-yellow-600 hover:text-yellow-900"
                  aria-label="Editar"
                >
                  <Edit className="h-5 w-5" />
                </button>
              )}

              {actionConfig.onDelete && !actionConfig.disableDelete && (
                <button
                  onClick={() => actionConfig.onDelete!(item)}
                  className="text-red-600 hover:text-red-900"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}

              {actionConfig.additionalActions?.map((action, index) => (
                <button
                  key={index}
                  onClick={() => action.onClick(item)}
                  className={
                    action.className || "text-gray-600 hover:text-gray-900"
                  }
                  aria-label={action.label}
                >
                  {action.icon}
                </button>
              ))}
            </div>
          );
        },
      })
    );
  }

  return columns;
}

export const standardProductColumns: ColumnMapping<
  Database["public"]["Tables"]["products"]["Row"]
>[] = [
  {
    field: "name",
    header: "Nombre",
    sortable: true,
  },
  {
    field: "batch_number",
    header: "Número de Lote",
  },
  {
    field: "origin_country",
    header: "País de Origen",
  },
  {
    field: "expiration_date",
    header: "Fecha de Vencimiento",
    accessor: (value) => {
      const date = new Date(value);
      return date.toLocaleDateString();
    },
  },
  {
    field: "description",
    header: "Descripción",
    accessor: (value) => value || "-",
  },
];

export const senasaProductColumns: ColumnMapping<
  Database["public"]["Tables"]["products"]["Row"]
>[] = [
  {
    field: "senasa_product_id",
    header: "ID SENASA",
    hidden: false,
  },
];

export function getProductColumns(
  senasaEnabled: boolean = false,
  actionConfig?: ActionConfig<Database["public"]["Tables"]["products"]["Row"]>
) {
  const allColumns = [
    ...standardProductColumns,
    ...(senasaEnabled ? senasaProductColumns : []),
  ];

  return createColumns(allColumns, actionConfig, { senasaEnabled });
}

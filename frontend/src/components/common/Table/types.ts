import { ColumnDef } from "@tanstack/react-table";

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  refetch?: () => void;
  isLoading?: boolean;
  noResultsMessage?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  paginationText?: (from: number, to: number, total: number) => string;
}
export interface Column<T> {
    key: keyof T | string;
    header: string;
    accessor?: (row: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
  }
  
  export interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (row: T) => void;
    loading?: boolean;
    emptyMessage?: string;
    className?: string;
  }
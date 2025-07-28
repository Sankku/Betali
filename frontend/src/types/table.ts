// Generic types for scalable table system

export type CellDataType = 
  | 'text'           // Simple text
  | 'number'         // Numbers
  | 'date'           // Dates
  | 'datetime'       // Date and time
  | 'currency'       // Currency
  | 'percentage'     // Percentages
  | 'boolean'        // True/False
  | 'badge'          // Badges with variants
  | 'image'          // Images
  | 'avatar'         // Avatars
  | 'link'           // Links
  | 'actions'        // Action buttons
  | 'icon-text'      // Icon + text
  | 'compound'       // Multiple combined fields
  | 'status'         // Status with toggle
  | 'progress'       // Progress bars
  | 'tag-list';      // Tag list

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

export type IconPosition = 'left' | 'right' | 'top' | 'bottom';

export interface CellConfig {
  dataType: CellDataType;
  
  // Text configuration
  textConfig?: {
    truncate?: number;
    transform?: 'uppercase' | 'lowercase' | 'capitalize';
    weight?: 'normal' | 'medium' | 'semibold' | 'bold';
    size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
    color?: string;
    prefix?: string;
    suffix?: string;
  };

  // Configuración de números
  numberConfig?: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
    format?: 'decimal' | 'currency' | 'percentage';
    locale?: string;
    showPositiveColor?: boolean;
    showNegativeColor?: boolean;
  };

  // Configuración de fechas
  dateConfig?: {
    format?: 'short' | 'medium' | 'long' | 'relative';
    locale?: string;
    timezone?: string;
  };

  // Configuración de badges
  badgeConfig?: {
    variant?: BadgeVariant;
    variantMap?: Record<string, BadgeVariant>; // Mapeo dinámico: valor -> variante
    labelMap?: Record<string, string>; // Mapeo dinámico: valor -> etiqueta
    size?: 'sm' | 'md' | 'lg';
  };

  // Configuración de íconos
  iconConfig?: {
    name?: string;
    position?: IconPosition;
    size?: number;
    color?: string;
    library?: 'lucide' | 'heroicons' | 'tabler';
  };

  // Configuración de campos compuestos
  compoundConfig?: {
    fields: Array<{
      key: string;
      type: CellDataType;
      config?: Omit<CellConfig, 'compoundConfig'>;
    }>;
    layout?: 'vertical' | 'horizontal';
    spacing?: 'tight' | 'normal' | 'loose';
  };

  // Configuración de acciones
  actionsConfig?: {
    actions: Array<{
      key: string;
      label?: string;
      icon?: string;
      variant?: 'default' | 'primary' | 'secondary' | 'danger';
      size?: 'sm' | 'md' | 'lg';
      disabled?: boolean;
    }>;
    layout?: 'horizontal' | 'dropdown';
  };

  // Configuración de estado con toggle
  statusConfig?: {
    activeLabel?: string;
    inactiveLabel?: string;
    activeVariant?: BadgeVariant;
    inactiveVariant?: BadgeVariant;
    showToggle?: boolean;
    toggleDisabled?: boolean;
  };

  // Configuración de imagen/avatar
  imageConfig?: {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    shape?: 'circle' | 'square' | 'rounded';
    fallback?: string;
    alt?: string;
  };

  // Configuración de enlace
  linkConfig?: {
    external?: boolean;
    color?: string;
    underline?: boolean;
  };

  // Configuración de progreso
  progressConfig?: {
    max?: number;
    showPercentage?: boolean;
    color?: string;
    height?: 'thin' | 'normal' | 'thick';
  };
}

export interface TableColumnConfig {
  key: string;                    // Clave del campo en los datos
  header: string;                 // Título de la columna
  cellConfig: CellConfig;         // Configuración de la celda
  sortable?: boolean;             // Si la columna es ordenable
  filterable?: boolean;           // Si la columna es filtrable
  width?: string;                 // Ancho de la columna
  minWidth?: string;              // Ancho mínimo
  sticky?: 'left' | 'right';     // Columna fija
  visible?: boolean;              // Si la columna está visible
}

export interface TableConfig {
  id: string;                     // ID único de la tabla
  name: string;                   // Nombre de la tabla
  columns: TableColumnConfig[];   // Configuración de columnas
  actions?: {                     // Acciones globales de la tabla
    create?: boolean;
    export?: boolean;
    import?: boolean;
    refresh?: boolean;
  };
  pagination?: {
    enabled: boolean;
    pageSize: number;
    pageSizeOptions: number[];
  };
  sorting?: {
    enabled: boolean;
    defaultSort?: {
      column: string;
      direction: 'asc' | 'desc';
    };
  };
  filtering?: {
    enabled: boolean;
    searchPlaceholder?: string;
  };
}
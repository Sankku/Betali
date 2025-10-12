# TableWithBulkActions Component

Un componente reutilizable que combina una tabla con funcionalidad de selección múltiple y acciones en lote.

## 🎯 Características

- ✅ Selección múltiple de filas
- ✅ Toolbar dinámico que cambia según la selección
- ✅ Acciones en lote configurables
- ✅ Contador de items seleccionados
- ✅ Validación de items válidos para cada acción
- ✅ Botón de crear integrado
- ✅ Componentes de filtro personalizables
- ✅ Estados visuales claros (seleccionado vs no seleccionado)
- ✅ TypeScript con tipos genéricos

## 📦 Uso Básico

```tsx
import { TableWithBulkActions, BulkAction } from '@/components/ui';

// Define tus acciones en lote
const bulkActions: BulkAction<MyType>[] = [
  {
    key: 'delete',
    label: 'Delete',
    icon: Trash,
    colorScheme: {
      bg: 'bg-white',
      border: 'border-red-300',
      text: 'text-red-700',
      hoverBg: 'hover:bg-red-50'
    },
    onClick: (selectedItems) => handleDelete(selectedItems),
    getValidItems: (items) => items.filter(item => item.canDelete),
  },
];

// Usa el componente
<TableWithBulkActions
  data={myData}
  columns={myColumns}
  loading={isLoading}
  getRowId={(row) => row.id}
  bulkActions={bulkActions}
  createButtonLabel="New Item"
  onCreateClick={handleCreate}
  onRowDoubleClick={handleEdit}
/>
```

## 🔧 Props

### Datos y Columnas

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `data` | `T[]` | ✅ | Array de datos a mostrar |
| `columns` | `any[]` | ✅ | Definición de columnas (formato TanStack Table) |
| `loading` | `boolean` | ❌ | Estado de carga |

### Selección

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `getRowId` | `(row: T) => string` | ✅ | Función para obtener ID único de cada fila |
| `onSelectionChange` | `(selected: T[]) => void` | ❌ | Callback cuando cambia la selección |

### Acciones en Lote

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `bulkActions` | `BulkAction<T>[]` | ❌ | Array de acciones en lote |

### Botón de Crear

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `createButtonLabel` | `string` | ❌ | Texto del botón crear (default: "New Item") |
| `onCreateClick` | `() => void` | ❌ | Callback al hacer click en crear |

### Opciones de Tabla

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `searchable` | `boolean` | ❌ | Habilitar búsqueda (default: true) |
| `enablePagination` | `boolean` | ❌ | Habilitar paginación (default: true) |
| `pageSize` | `number` | ❌ | Tamaño de página (default: 20) |
| `emptyMessage` | `string` | ❌ | Mensaje cuando no hay datos |
| `onRowDoubleClick` | `(row: T) => void` | ❌ | Callback al hacer doble click en fila |

### Personalización

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `filterComponents` | `ReactNode` | ❌ | Componentes de filtro personalizados |
| `customToolbarLeft` | `(selected: T[]) => ReactNode` | ❌ | Contenido custom lado izquierdo |
| `customToolbarRight` | `(selected: T[]) => ReactNode` | ❌ | Contenido custom lado derecho |

## 🎨 BulkAction Interface

```typescript
interface BulkAction<T = any> {
  key: string;                                    // ID único de la acción
  label: string;                                  // Texto del botón
  icon: React.ComponentType<{ className?: string }>; // Icono (de lucide-react)

  // Esquema de colores
  colorScheme?: {
    bg: string;       // Background class (ej: 'bg-white')
    border: string;   // Border class (ej: 'border-red-300')
    text: string;     // Text color class (ej: 'text-red-700')
    hoverBg: string;  // Hover background (ej: 'hover:bg-red-50')
  };

  onClick: (selectedItems: T[]) => void;         // Handler cuando se hace click
  isDisabled?: (selectedItems: T[]) => boolean;  // Función para deshabilitar
  getValidItems?: (selectedItems: T[]) => T[];   // Filtrar items válidos
  showCount?: boolean;                            // Mostrar contador (default: true)
  alwaysShow?: boolean;                           // Mostrar aunque no haya items válidos
}
```

## 📝 Ejemplos Completos

### Ejemplo 1: Acciones de Estado (Orders)

```tsx
const bulkActions: BulkAction<Order>[] = [
  {
    key: 'process',
    label: 'Process',
    icon: Play,
    colorScheme: {
      bg: 'bg-white',
      border: 'border-blue-300',
      text: 'text-blue-700',
      hoverBg: 'hover:bg-blue-50'
    },
    onClick: (orders) => handleBatchProcess(orders),
    getValidItems: (orders) => orders.filter(o => o.status === 'pending'),
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: Trash,
    colorScheme: {
      bg: 'bg-white',
      border: 'border-red-300',
      text: 'text-red-700',
      hoverBg: 'hover:bg-red-50'
    },
    onClick: (orders) => handleBatchDelete(orders),
    getValidItems: (orders) => orders.filter(o => !['completed', 'shipped'].includes(o.status)),
  },
];
```

### Ejemplo 2: Con Filtros Personalizados

```tsx
const filterComponents = (
  <div className="flex gap-4">
    <Input
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger>
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

<TableWithBulkActions
  data={data}
  columns={columns}
  filterComponents={filterComponents}
  // ... otras props
/>
```

### Ejemplo 3: Acción que Siempre se Muestra

```tsx
{
  key: 'export',
  label: 'Export',
  icon: Download,
  onClick: (items) => handleExport(items),
  alwaysShow: true, // Se muestra aunque no haya items válidos
  showCount: true,  // Muestra "(5)" con el número de items
}
```

## 🎯 Beneficios

1. **DRY (Don't Repeat Yourself)**: Escribe la lógica una vez, úsala en todas partes
2. **Consistencia**: Mismo comportamiento en todas las tablas de la app
3. **Mantenibilidad**: Cambios en un solo lugar afectan todas las tablas
4. **Type-safe**: TypeScript genéricos para seguridad de tipos
5. **Flexible**: Altamente personalizable mediante props

## 🔄 Migración desde Tabla Actual

**Antes:**
```tsx
// Código duplicado en cada página
const [selectedItems, setSelectedItems] = useState([]);
const handleSelectionChange = ...
const getValidItems = ...
// ... 100+ líneas de código repetido
```

**Después:**
```tsx
// Todo abstracto en el componente
<TableWithBulkActions
  data={data}
  columns={columns}
  bulkActions={bulkActions}
  // ... props simples
/>
```

## 💡 Tips

1. **Usa `getValidItems`** para filtrar items que pueden recibir cierta acción
2. **Define `colorScheme`** consistente según el tipo de acción (destructivo=rojo, success=verde, etc.)
3. **Usa `alwaysShow: true`** para acciones como "Export" o "Duplicate" que siempre son válidas
4. **Combina con modals** para confirmaciones de acciones destructivas
5. **TypeScript**: Especifica el tipo genérico `<Order>`, `<Product>`, etc. para autocompletado

## 🐛 Troubleshooting

**La selección no se limpia al cambiar filtros**
- ✅ Ya está implementado automáticamente con `useEffect`

**Los botones no aparecen**
- Verifica que `getValidItems` devuelva items válidos
- O usa `alwaysShow: true` si debe aparecer siempre

**El contador muestra el número incorrecto**
- `showCount` usa el resultado de `getValidItems`, no el total seleccionado

## 📚 Ver También

- [DataTable Component](./data-table.tsx)
- [Button Component](./button.tsx)
- [Card Component](./card.tsx)

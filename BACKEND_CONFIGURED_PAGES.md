# 📋 Backend Configured Pages - Guía de Desarrollo

Esta documentación explica cómo funciona la nueva arquitectura de páginas con tablas configurables desde el backend en AgroPanel.

## 🏗️ Arquitectura General

### Flujo de Datos
```
Backend Config (DB) → API → Frontend Hook → BackendConfiguredTable → GenericCell → Specific Cells
```

### Componentes Principales
- **Backend**: Configuraciones de tabla almacenadas en base de datos
- **Frontend**: `BackendConfiguredTable` que renderiza dinámicamente según configuración
- **Células**: Sistema modular de tipos de celda (`TextCell`, `BadgeCell`, `CompoundCell`, etc.)

## 🚀 Creando una Nueva Página

### 1. Configuración Backend

Primero, agrega la configuración de tu tabla en `backend/scripts/populate-table-configs.js`:

```javascript
{
  id: 'mi_nueva_tabla',
  name: 'Gestión de Mi Entidad',
  entity: 'mi_entidad',
  config: {
    columns: [
      {
        key: 'name',
        header: 'Nombre',
        dataType: 'compound',
        sortable: true,
        filterable: true,
        compoundConfig: {
          fields: [
            {
              key: 'name',
              type: 'icon-text',
              config: {
                dataType: 'icon-text',
                iconConfig: { name: 'user', position: 'left', size: 16 },
                textConfig: { weight: 'medium' }
              }
            },
            {
              key: 'email',
              type: 'text',
              config: {
                dataType: 'text',
                textConfig: { 
                  size: 'sm', 
                  color: 'text-neutral-500',
                  prefix: '✉️ '
                }
              }
            }
          ],
          layout: 'vertical',
          spacing: 'tight'
        }
      },
      {
        key: 'status',
        header: 'Estado',
        dataType: 'status',
        sortable: true,
        filterable: true,
        statusConfig: {
          activeLabel: 'Activo',
          inactiveLabel: 'Inactivo',
          activeVariant: 'success',
          inactiveVariant: 'danger',
          showToggle: true,
          toggleDisabled: false
        }
      },
      {
        key: 'created_at',
        header: 'Fecha Creación',
        dataType: 'date',
        sortable: true,
        dateConfig: {
          format: 'short',
          locale: 'es-ES'
        }
      },
      {
        key: 'actions',
        header: 'Acciones',
        dataType: 'actions',
        sortable: false,
        filterable: false,
        actionsConfig: {
          actions: [
            { key: 'view', label: 'Ver', icon: 'eye', variant: 'ghost' },
            { key: 'edit', label: 'Editar', icon: 'edit', variant: 'ghost' },
            { key: 'delete', label: 'Eliminar', icon: 'trash', variant: 'destructive' }
          ]
        }
      }
    ],
    pagination: {
      enabled: true,
      defaultPageSize: 10,
      pageSizeOptions: [5, 10, 20, 50]
    },
    search: {
      enabled: true,
      placeholder: 'Buscar entidades...',
      searchableColumns: ['name', 'email']
    }
  }
}
```

### 2. Ejecutar Script de Configuración

```bash
cd backend && bun run scripts/populate-table-configs.js
```

### 3. Crear Página Frontend

Crea tu página siguiendo este template (`src/pages/Dashboard/MiEntidad.tsx`):

```tsx
import React, { useCallback, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle } from 'lucide-react';
import { CRUDPage } from '../../components/templates/crud-page';
import { BackendConfiguredTable } from '../../components/table/BackendConfiguredTable';
import { useTableConfig } from '../../hooks/useTableConfig';
import { MiEntidadModal, MiEntidad, MiEntidadFormData } from '../../components/features/mi-entidad';
import { Button } from '../../components/ui/button';
import { ToastContainer } from '../../components/ui/toast';
import {
  useMiEntidadManagement,
  useCreateMiEntidad,
  useUpdateMiEntidad,
  useDeleteMiEntidad,
} from '../../hooks/useMiEntidad';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '../../components/ui';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  item?: MiEntidad;
}

interface DeleteConfirmState {
  show: boolean;
  item?: MiEntidad;
}

const MiEntidadPage: React.FC = () => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
  });

  // Use the new table configuration system
  const {
    data: tableConfig,
    isLoading: configLoading,
    error: configError,
  } = useTableConfig('mi_nueva_tabla'); // ← ID de tu configuración

  const { items, isLoading, error } = useMiEntidadManagement();
  const createItem = useCreateMiEntidad();
  const updateItem = useUpdateMiEntidad();
  const deleteItem = useDeleteMiEntidad();

  const openModal = (mode: ModalState['mode'], item?: MiEntidad) => {
    setModal({ isOpen: true, mode, item });
  };

  const closeModal = () => {
    setModal({ isOpen: false, mode: 'create', item: undefined });
  };

  const handleCreateClick = () => openModal('create');

  const handleDelete = async (item: MiEntidad) => {
    if (!item?.id) {
      console.error('Item ID is missing:', item);
      return;
    }
    setShowDeleteConfirm({ show: true, item });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.item?.id) {
      try {
        await deleteItem.mutateAsync(showDeleteConfirm.item.id);
        setShowDeleteConfirm({ show: false });
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const closeDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm({ show: false });
  }, []);

  const handleSubmit = async (data: MiEntidadFormData) => {
    try {
      if (modal.mode === 'create') {
        await createItem.mutateAsync(data);
      } else if (modal.mode === 'edit' && modal.item?.id) {
        await updateItem.mutateAsync({
          id: modal.item.id,
          data: data,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  // Handle table actions from the configurable table
  const handleTableAction = useCallback((action: string, row: MiEntidad) => {
    switch (action) {
      case 'view':
        openModal('view', row);
        break;
      case 'edit':
        openModal('edit', row);
        break;
      case 'delete':
        handleDelete(row);
        break;
      case 'create':
        openModal('create');
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }, []);

  const isLoaderVisible =
    createItem.isPending || updateItem.isPending || deleteItem.isPending;

  return (
    <>
      <Helmet>
        <title>Mi Entidad - Dashboard</title>
      </Helmet>

      <CRUDPage
        title={(tableConfig as any)?.name || 'Gestión de Mi Entidad'}
        description={
          configLoading
            ? 'Cargando configuración de tabla...'
            : 'Administre mi entidad y su información'
        }
        data={items}
        isLoading={isLoading || isLoaderVisible || configLoading}
        error={error || configError}
        onCreateClick={handleCreateClick}
        customTable={
          tableConfig ? (
            <BackendConfiguredTable
              config={tableConfig as any}
              data={items}
              onAction={handleTableAction}
              isLoading={isLoading || isLoaderVisible}
            />
          ) : null
        }
      />

      <MiEntidadModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        mode={modal.mode}
        item={modal.item}
        onSubmit={handleSubmit}
        isLoading={createItem.isPending || updateItem.isPending}
      />

      <Modal isOpen={showDeleteConfirm.show} onClose={closeDeleteConfirm} size="sm">
        <ModalContent>
          <ModalHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ModalTitle>¿Eliminar elemento?</ModalTitle>
            <ModalDescription>
              Esta acción no se puede deshacer. El elemento{' '}
              <span className="font-medium text-neutral-900">
                "{showDeleteConfirm.item?.name || 'seleccionado'}"
              </span>{' '}
              será eliminado permanentemente.
            </ModalDescription>
          </ModalHeader>

          <ModalFooter className="flex flex-col-reverse justify-center sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteConfirm}
              disabled={deleteItem.isPending}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteItem.isPending}
              className="w-full sm:w-auto"
            >
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <ToastContainer />
    </>
  );
};

export default MiEntidadPage;
```

## 📊 Tipos de Celdas Disponibles

### 1. **Text Cell** (`dataType: 'text'`)
Celda básica de texto con opciones de formateo.

```javascript
{
  key: 'description',
  header: 'Descripción',
  dataType: 'text',
  textConfig: {
    truncate: 50,        // Corta texto después de 50 caracteres
    weight: 'medium',    // normal, medium, semibold, bold
    size: 'sm',          // xs, sm, base, lg, xl
    color: 'text-blue-600',
    prefix: '📝 ',
    suffix: ' chars',
    transform: 'capitalize'  // none, uppercase, lowercase, capitalize
  }
}
```

### 2. **Icon Text Cell** (`dataType: 'icon-text'`)
Texto con icono incluido.

```javascript
{
  key: 'email',
  header: 'Email',
  dataType: 'icon-text',
  iconConfig: {
    name: 'mail',         // Nombre del icono de Lucide React
    position: 'left',     // left, right
    size: 16             // Tamaño en px
  },
  textConfig: {
    weight: 'normal'
  }
}
```

### 3. **Compound Cell** (`dataType: 'compound'`)
Combina múltiples campos en una sola celda.

```javascript
{
  key: 'user_info',
  header: 'Usuario',
  dataType: 'compound',
  compoundConfig: {
    fields: [
      {
        key: 'name',
        type: 'icon-text',
        config: {
          dataType: 'icon-text',
          iconConfig: { name: 'user', position: 'left', size: 16 },
          textConfig: { weight: 'medium' }
        }
      },
      {
        key: 'email',
        type: 'text',
        config: {
          dataType: 'text',
          textConfig: { size: 'sm', color: 'text-neutral-500' }
        }
      }
    ],
    layout: 'vertical',    // vertical, horizontal
    spacing: 'tight'       // tight, normal, loose
  }
}
```

### 4. **Badge Cell** (`dataType: 'badge'`)
Insignias de estado o categoría.

```javascript
{
  key: 'status',
  header: 'Estado',
  dataType: 'badge',
  badgeConfig: {
    variantMap: {
      'active': 'success',
      'inactive': 'danger',
      'pending': 'warning'
    },
    labelMap: {
      'active': 'Activo',
      'inactive': 'Inactivo',
      'pending': 'Pendiente'
    },
    size: 'md'            // sm, md, lg
  }
}
```

### 5. **Status Cell** (`dataType: 'status'`)
Estado con toggle interactivo.

```javascript
{
  key: 'is_active',
  header: 'Estado',
  dataType: 'status',
  statusConfig: {
    activeLabel: 'Activo',
    inactiveLabel: 'Inactivo',
    activeVariant: 'success',
    inactiveVariant: 'danger',
    showToggle: true,         // Permite cambiar estado
    toggleDisabled: false
  }
}
```

### 6. **Date Cell** (`dataType: 'date'`)
Fechas con formato localizado.

```javascript
{
  key: 'created_at',
  header: 'Fecha',
  dataType: 'date',
  dateConfig: {
    format: 'short',         // short, long, relative
    locale: 'es-ES',
    showTime: true
  }
}
```

### 7. **Number Cell** (`dataType: 'number'`)
Números con formato.

```javascript
{
  key: 'price',
  header: 'Precio',
  dataType: 'number',
  numberConfig: {
    format: 'currency',      // integer, decimal, currency, percentage
    currency: 'ARS',
    decimals: 2,
    prefix: '$',
    suffix: ' ARS'
  }
}
```

### 8. **Actions Cell** (`dataType: 'actions'`)
Botones de acción.

```javascript
{
  key: 'actions',
  header: 'Acciones',
  dataType: 'actions',
  actionsConfig: {
    actions: [
      { 
        key: 'view', 
        label: 'Ver', 
        icon: 'eye', 
        variant: 'ghost' 
      },
      { 
        key: 'edit', 
        label: 'Editar', 
        icon: 'edit', 
        variant: 'ghost' 
      },
      { 
        key: 'delete', 
        label: 'Eliminar', 
        icon: 'trash', 
        variant: 'destructive' 
      }
    ]
  }
}
```

## 🎯 Manejo de Acciones

Las acciones se manejan en `handleTableAction`:

```tsx
const handleTableAction = useCallback((action: string, row: MyEntity, columnKey?: string) => {
  switch (action) {
    case 'view':
      openModal('view', row);
      break;
    case 'edit':
      openModal('edit', row);
      break;
    case 'delete':
      handleDelete(row);
      break;
    case 'toggle':
      handleToggleStatus(row);
      break;
    case 'custom_action':
      handleCustomAction(row);
      break;
    default:
      console.warn('Unknown action:', action);
  }
}, []);
```

## 🔧 Configuración de Columnas

### Propiedades Comunes
```javascript
{
  key: 'field_name',         // Campo en los datos
  header: 'Encabezado',      // Texto del encabezado
  dataType: 'text',          // Tipo de celda
  sortable: true,            // Permite ordenamiento
  filterable: true,          // Permite filtrado
  width: 200,                // Ancho fijo opcional
  // Configuración específica del tipo...
}
```

### Configuración de Tabla
```javascript
{
  pagination: {
    enabled: true,
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  },
  search: {
    enabled: true,
    placeholder: 'Buscar...',
    searchableColumns: ['name', 'email']
  },
  sorting: {
    enabled: true,
    defaultSort: {
      column: 'created_at',
      direction: 'desc'
    }
  }
}
```

## 📝 Ejemplo: Página de Clientes

```javascript
// Backend config
{
  id: 'customers',
  name: 'Gestión de Clientes',
  entity: 'customers',
  config: {
    columns: [
      {
        key: 'customer_info',
        header: 'Cliente',
        dataType: 'compound',
        compoundConfig: {
          fields: [
            {
              key: 'name',
              type: 'icon-text',
              config: {
                iconConfig: { name: 'user', position: 'left', size: 16 },
                textConfig: { weight: 'medium' }
              }
            },
            {
              key: 'email',
              type: 'text',
              config: {
                textConfig: { size: 'sm', color: 'text-neutral-500', prefix: '✉️ ' }
              }
            }
          ],
          layout: 'vertical',
          spacing: 'tight'
        }
      },
      {
        key: 'phone',
        header: 'Teléfono',
        dataType: 'icon-text',
        iconConfig: { name: 'phone', position: 'left', size: 16 }
      },
      {
        key: 'status',
        header: 'Estado',
        dataType: 'badge',
        badgeConfig: {
          variantMap: {
            'active': 'success',
            'inactive': 'danger',
            'pending': 'warning'
          }
        }
      },
      {
        key: 'created_at',
        header: 'Registro',
        dataType: 'date',
        dateConfig: { format: 'short', locale: 'es-ES' }
      }
    ]
  }
}
```

## 🚀 Ventajas de esta Arquitectura

✅ **Configuración Dinámica**: Cambios desde backend sin deployar frontend
✅ **Reutilización**: Mismos componentes para todas las páginas
✅ **Consistencia**: UI uniforme en todo el sistema
✅ **Escalabilidad**: Fácil agregar nuevos tipos de celda
✅ **Mantenibilidad**: Código centralizado y modular
✅ **Flexibilidad**: Soporte para casos complejos con compound cells

## 🔄 Migración desde Páginas Legacy

Si tienes páginas que usan `createEntityTableColumns`, sigue estos pasos:

1. Crea configuración backend
2. Reemplaza imports legacy por `BackendConfiguredTable` y `useTableConfig`
3. Actualiza `handleTableAction` para manejar todas las acciones
4. Elimina imports de `columnFactory` y `entity-table`
5. Testa que todo funcione correctamente

¡Ahora tienes todas las herramientas para crear páginas modernas y escalables! 🎉
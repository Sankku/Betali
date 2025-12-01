# Guía de Internacionalización (i18n)

## 📚 Sistema Implementado

El sistema de traducciones está completamente funcional con soporte para **Español** e **Inglés**.

### ✅ Componentes Ya Migrados:

1. **Layout & Navegación** ([DashboardLayout.tsx](src/components/layout/Dashboard/DashboardLayout.tsx))
   - Sidebar completo
   - Todos los ítems de navegación
   - Menú mobile

2. **Configuración** ([Settings.tsx](src/pages/Dashboard/Settings.tsx))
   - Selector de idioma
   - Configuración de formato de fecha
   - Todos los textos traducidos

### 📝 Traducciones Disponibles:

Los archivos de traducción ([es.ts](src/locales/es.ts) y [en.ts](src/locales/en.ts)) incluyen:

- ✅ `common.*` - Textos comunes (botones, acciones, etc.)
- ✅ `nav.*` - Navegación
- ✅ `layout.*` - Layout general
- ✅ `products.*` - Productos (todos los textos incluyendo formularios)
- ✅ `clients.*` - Clientes
- ✅ `orders.*` - Pedidos
- ✅ `warehouse.*` - Almacenes
- ✅ `stockMovements.*` - Movimientos de stock
- ✅ `suppliers.*` - Proveedores
- ✅ `users.*` - Usuarios
- ✅ `organizations.*` - Organizaciones
- ✅ `taxManagement.*` - Gestión de impuestos
- ✅ `auth.*` - Autenticación
- ✅ `errors.*` - Mensajes de error
- ✅ `confirmations.*` - Confirmaciones

## 🚀 Cómo Usar en tus Componentes

### 1. Importar el hook:

```tsx
import { useTranslation } from '../contexts/LanguageContext';
```

### 2. Usar en el componente:

```tsx
function MiComponente() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('products.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### 3. Con parámetros dinámicos:

```tsx
// Para textos como "¿Eliminar 5 productos?"
t('products.deleteConfirm', { count: '5' })

// Para "Hace 3 días"
t('dateContext.daysAgo', { days: '3' })
```

## 📋 Pasos para Migrar un Componente

### Ejemplo: Migrar Products.tsx

**Antes:**
```tsx
<h1>Products</h1>
<button>Add Product</button>
<button>Delete</button>
```

**Después:**
```tsx
import { useTranslation } from '../../contexts/LanguageContext';

function Products() {
  const { t } = useTranslation();

  return (
    <>
      <h1>{t('products.title')}</h1>
      <button>{t('products.add')}</button>
      <button>{t('common.delete')}</button>
    </>
  );
}
```

## 🎯 Componentes que Faltan Migrar

Los siguientes componentes aún tienen textos hardcodeados que deberían usar traducciones:

### Alta Prioridad:
- [ ] `/pages/Dashboard/Products.tsx`
- [ ] `/pages/Dashboard/Clients.tsx`
- [ ] `/pages/Dashboard/Orders.tsx`
- [ ] `/pages/Dashboard/Warehouse.tsx`
- [ ] `/pages/Dashboard/Users.tsx`
- [ ] `/pages/Login.tsx`
- [ ] `/pages/Register.tsx`

### Media Prioridad:
- [ ] `/components/features/products/*` (modales, formularios)
- [ ] `/components/features/clients/*`
- [ ] `/components/features/orders/*`
- [ ] `/components/templates/crud-page.tsx`
- [ ] `/components/ui/table-with-bulk-actions.tsx`

### Baja Prioridad:
- [ ] Mensajes de toast/notificaciones
- [ ] Mensajes de validación de formularios
- [ ] Tooltips y ayudas contextuales

## 🔧 Agregar Nuevas Traducciones

1. **Edita** `src/locales/es.ts` y agrega tu nueva clave:
```typescript
export const es = {
  // ...
  miNuevaSeccion: {
    titulo: 'Mi Título',
    descripcion: 'Mi descripción',
  },
}
```

2. **Actualiza** `src/locales/en.ts` con la traducción en inglés:
```typescript
export const en: TranslationKeys = {
  // ...
  miNuevaSeccion: {
    titulo: 'My Title',
    descripcion: 'My description',
  },
}
```

3. **Usa** en tu componente:
```tsx
{t('miNuevaSeccion.titulo')}
```

## 📌 Notas Importantes

- El idioma se guarda automáticamente en `localStorage`
- El idioma por defecto es **Español**
- Los usuarios pueden cambiar el idioma desde **Settings**
- TypeScript te ayudará con autocompletado de las claves de traducción

## 🌐 Estado Actual

- **Sistema**: ✅ 100% Funcional
- **Archivos de traducción**: ✅ Expandidos con todo el contenido
- **Settings**: ✅ Completamente traducido
- **Layout/Nav**: ✅ Completamente traducido
- **Páginas principales**: ⚠️ Pendiente (tienen todas las traducciones disponibles, solo falta integrarlas)
- **Compilación**: ✅ Sin errores

---

**Pro Tip**: Usa el prefijo `common.*` para textos reutilizables como botones, acciones, etc.
